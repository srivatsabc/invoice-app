from fastapi import APIRouter, HTTPException, Query, Depends, Request, Body
from typing import Optional, Dict, Any, List
import os
import json
from datetime import datetime
from pydantic import BaseModel, Field
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from ..models.sql_agent import (
    SQLAgentRequest, SQLQueryResult, SQLAgentResponse
)
# Import dependencies for the SQL agent
from langchain_openai import AzureChatOpenAI
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents.agent_toolkits import create_retriever_tool
from langchain_community.vectorstores import Chroma
from langchain_openai import AzureOpenAIEmbeddings
from langchain.agents import tool
from langchain.callbacks.base import BaseCallbackHandler
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

import ast
import re
from uuid import uuid4

router = APIRouter(
    prefix="/api/v3/invoice-management",
    tags=["sql-agent"],
    responses={404: {"description": "Not found"}},
)

# Configuration constants
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "sql-center")
PROPER_NOUNS_COLLECTION = os.getenv("QDRANT_PROPER_NOUNS_COLLECTION", "sql-proper-nouns")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Helper functions for the SQL agent
def query_as_list(db, query):
    """Execute a query and return unique list of results with numbers removed"""
    try:
        res = db.run(query)
        res = [el for sub in ast.literal_eval(res) for el in sub if el]
        res = [re.sub(r"\b\d+\b", "", string).strip() for string in res]
        return list(set(res))
    except Exception as e:
        logger.error(f"{Colors.RED}Error executing query: {str(e)}{Colors.RESET}")
        return []

class SQLHandler(BaseCallbackHandler):
    """Enhanced callback handler to track SQL query execution and capture rephrased questions"""
    def __init__(self):
        self.sql_result = []
        self.successful_query_executed = False
        self.last_result = None
        self.debug_info = []
        self.rephrased_question = None  # Add this attribute

    def on_agent_action(self, action, **kwargs):
        """Enhanced tracking with rephrased question capture and better success detection"""
        
        # Capture rephrased question from search_similar_sql_patterns tool
        if action.tool == "search_similar_sql_patterns":
            self.rephrased_question = action.tool_input.get("task_description", "")
            logger.debug(f"{Colors.CYAN}Captured rephrased question: {self.rephrased_question}{Colors.RESET}")
        
        # Track SQL query executions with enhanced success detection
        if action.tool == "sql_db_query":
            # Record the query attempt
            query_info = {"query": action.tool_input["query"]}
            self.sql_result.append(query_info)
            
            # Debug: Log the observation for inspection
            observation_str = str(action.observation)
            self.debug_info.append(f"Tool: sql_db_query, Observation: {observation_str[:100]}")
            
            # Enhanced success detection:
            # 1. No "Error" prefix
            # 2. Contains a tuple-like pattern [(something,)] which indicates SQL results
            if (not observation_str.startswith("Error") and
                "(" in observation_str and ")" in observation_str):
                self.successful_query_executed = True
                self.last_result = observation_str
                query_info["successful"] = True
                query_info["result"] = observation_str
                logger.info(f"{Colors.GREEN}Successful SQL execution: {action.tool_input['query']}{Colors.RESET}")
            else:
                query_info["successful"] = False
                query_info["error"] = observation_str
                logger.warning(f"{Colors.YELLOW}SQL query failed: {action.tool_input['query']}{Colors.RESET}")

# Initialize the database connection
@log_function_call
async def get_database_connection():
    """Get a connection to the invoice database"""
    try:
        db_user = os.environ["DB_USER"]
        db_password = os.environ["DB_PASSWORD"]
        db_host = os.environ.get("DB_HOST", "aidbhost01.database.windows.net")
        db_name = os.environ.get("DB_NAME", "gwh")
        
        table_list = ['invoice_headers', 'invoice_line_items', 'invoice_files', 'brand_feedback']
        
        db = SQLDatabase.from_uri(
            f"mssql+pymssql://{db_user}:{db_password}@{db_host}/{db_name}",
            sample_rows_in_table_info=3,
            include_tables=table_list
        )
        return db
    except Exception as e:
        logger.error(f"{Colors.RED}Error connecting to database: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

# Initialize the LLM
@log_function_call
async def get_llm():
    """Get the large language model"""
    try:
        llm = AzureChatOpenAI(
            temperature=0,
            api_key=os.getenv("AZURE_OPENAI_KEY"),
            api_version="2024-08-01-preview",
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            model="gpt-4o-2"
        )
        return llm
    except Exception as e:
        logger.error(f"{Colors.RED}Error initializing LLM: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"LLM initialization error: {str(e)}")

# Initialize the vector database
@log_function_call
async def get_vectorstore():
    """Get or create the vector database for storing query history"""
    try:
        embeddings = AzureOpenAIEmbeddings(
            api_key=os.getenv("AZURE_OPENAI_KEY"), 
            api_version="2024-02-15-preview", 
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"), 
            model="text-embedding-3-large"  # Updated to use 3-large
        )
        
        client = QdrantClient(url=QDRANT_URL)
        
        # Create main collection for SQL queries
        try:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=3072, distance=Distance.COSINE),  # Updated size for 3-large
            )
            logger.info(f"{Colors.GREEN}Created new Qdrant collection: {COLLECTION_NAME}{Colors.RESET}")
        except Exception:
            logger.info(f"{Colors.BLUE}Using existing Qdrant collection: {COLLECTION_NAME}{Colors.RESET}")
        
        vectorstore = QdrantVectorStore(
            client=client,
            collection_name=COLLECTION_NAME,
            embedding=embeddings,
        )
        
        # Return the vector store, client, and embeddings
        return vectorstore, client, embeddings
    except Exception as e:
        logger.error(f"{Colors.RED}Error initializing vector database: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Vector database initialization error: {str(e)}")

# Functions for working with the vector database
async def is_duplicate_query(vectorstore, question, similarity_threshold=0.95):
    """Check if a question is too similar to existing ones in the vector store"""
    try:
        # Search for the most similar existing question
        results = vectorstore.similarity_search_with_score(
            query=question,
            k=1
        )
        
        # If no results, it's not a duplicate
        if not results:
            return False
            
        doc, score = results[0]
        existing_question = doc.metadata.get("question", "")
        
        # Calculate normalized score (higher is more similar)
        logger.debug(f"{Colors.CYAN}Most similar question: {existing_question}{Colors.RESET}")
        logger.debug(f"{Colors.CYAN}Similarity score: {score}{Colors.RESET}")
        
        # If score exceeds threshold, it's a duplicate
        is_duplicate = score >= similarity_threshold
        if is_duplicate:
            logger.info(f"{Colors.YELLOW}Query considered duplicate of: {existing_question}{Colors.RESET}")
        
        return is_duplicate
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error checking for duplicate query: {str(e)}{Colors.RESET}")
        return False  # If we can't check, assume it's not a duplicate

async def store_in_qdrant(vectorstore, question, answer, sql_queries):
    """Store the question, answer, and SQL queries in Qdrant vector database"""
    # Skip storage for empty answers or clear errors
    if not answer or "error" in answer.lower() or "agent stopped" in answer.lower():
        logger.warning(f"{Colors.YELLOW}Skipping storage of failed query result - answer indicates failure{Colors.RESET}")
        return
    
    # Check if this is a duplicate query
    if await is_duplicate_query(vectorstore, question):
        logger.info(f"{Colors.YELLOW}Skipping storage - question is too similar to existing entries{Colors.RESET}")
        return
        
    # Create the document with metadata
    sql_queries_str = "\n".join(sql_queries)
    document_text = f"Question: {question}\nAnswer: {answer}\nSQL Queries: {sql_queries_str}"
    
    metadata = {
        "question": question,
        "answer": answer,
        "sql_queries": sql_queries,
        "timestamp": datetime.now().isoformat()
    }
    
    # Add the document to the vector store
    vectorstore.add_texts(
        texts=[document_text],
        metadatas=[metadata]
    )
    
    logger.info(f"{Colors.GREEN}Successfully stored query result in Qdrant collection '{COLLECTION_NAME}'{Colors.RESET}")

async def get_similar_queries(vectorstore, query_text, top_k=2, min_score=0.5, max_score=0.95):
    """Find similar previous queries in the Qdrant vector store, ensuring diversity"""
    try:
        # Get more results than needed to allow for filtering
        results = vectorstore.similarity_search_with_score(
            query=query_text,
            k=top_k * 2  # Get twice as many to filter
        )
        
        examples = []
        for doc, score in results:
            # Only include queries in the right similarity range
            # - Not too similar (would be duplicates)
            # - Not too different (would be irrelevant)
            if min_score <= score <= max_score:
                example = {
                    "question": doc.metadata.get("question", ""),
                    "sql_query": doc.metadata.get("sql_queries", [])[0] if doc.metadata.get("sql_queries") else "",
                    "similarity_score": float(score)
                }
                examples.append(example)
                
                # Stop once we have enough examples
                if len(examples) >= top_k:
                    break
        
        logger.info(f"{Colors.GREEN}Found {len(examples)} similar queries{Colors.RESET}")
        return examples
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving similar queries: {str(e)}{Colors.RESET}")
        return []

# Initialize proper nouns data
async def initialize_proper_nouns_data(db, proper_nouns_vectorstore):
    """Initialize the proper nouns collection with vendors and descriptions"""
    try:
        # Check if collection already has data
        collection_info = proper_nouns_vectorstore.client.get_collection(PROPER_NOUNS_COLLECTION)
        if collection_info.points_count > 0:
            logger.info(f"{Colors.BLUE}Proper nouns collection already has {collection_info.points_count} entries{Colors.RESET}")
            return
        
        # Get vendors and descriptions from database
        vendors = query_as_list(db, "SELECT DISTINCT vendor FROM invoices")
        descriptions = query_as_list(db, "select description FROM invoice_line_items")
        
        # Prepare documents with metadata
        texts = []
        metadatas = []
        
        for vendor in vendors:
            if vendor.strip():  # Skip empty vendors
                texts.append(vendor)
                metadatas.append({
                    "type": "vendor",
                    "text": vendor,
                    "timestamp": datetime.now().isoformat()
                })
        
        for description in descriptions:
            if description.strip():  # Skip empty descriptions
                texts.append(description)
                metadatas.append({
                    "type": "description", 
                    "text": description,
                    "timestamp": datetime.now().isoformat()
                })
        
        # Add to vector store
        if texts:
            proper_nouns_vectorstore.add_texts(
                texts=texts,
                metadatas=metadatas
            )
            logger.info(f"{Colors.GREEN}Added {len(texts)} proper nouns to Qdrant ({len(vendors)} vendors, {len(descriptions)} descriptions){Colors.RESET}")
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error initializing proper nouns data: {str(e)}{Colors.RESET}")

# Create the search similar SQL patterns tool
@tool
def search_similar_sql_patterns(task_description: str) -> str:
    """
    Search for similar SQL query patterns from previous successful queries.
    
    Use this tool when:
    - You need examples of specific SQL patterns or syntax
    - You encounter complex queries you haven't seen before  
    - Your first SQL attempt fails and you need alternative approaches
    - The user question is ambiguous and examples would help clarify the pattern
    
    IMPORTANT: Always use complete, descriptive phrases when searching.
    If user asks incomplete questions like "bottom 3?", expand to full context 
    like "bottom 3 regions by total invoice amount" before searching.
    
    Args:
        task_description: Complete description of what you're trying to accomplish
        
    Returns:
        Formatted examples with similar questions and their SQL queries
    """
    # This will be populated during agent setup
    return "Tool not yet configured"

# Create the agent's tools
@log_function_call
async def setup_agent_tools(db, vectorstore_client, embeddings, vectorstore):
    """Set up the tools for the SQL agent using Qdrant for entity lookup"""
    try:
        # Create proper nouns collection
        try:
            vectorstore_client.create_collection(
                collection_name=PROPER_NOUNS_COLLECTION,
                vectors_config=VectorParams(size=3072, distance=Distance.COSINE),  # Updated size
            )
            logger.info(f"{Colors.GREEN}Created new Qdrant collection for proper nouns: {PROPER_NOUNS_COLLECTION}{Colors.RESET}")
        except Exception:
            logger.info(f"{Colors.BLUE}Using existing Qdrant collection for proper nouns: {PROPER_NOUNS_COLLECTION}{Colors.RESET}")
        
        # Create proper nouns vector store
        proper_nouns_store = QdrantVectorStore(
            client=vectorstore_client,
            collection_name=PROPER_NOUNS_COLLECTION,
            embedding=embeddings,
        )
        
        # Initialize proper nouns data
        await initialize_proper_nouns_data(db, proper_nouns_store)
        
        # Create search proper nouns tool
        @tool
        def search_proper_nouns(query: str) -> str:
            """
            Look up vendor names or descriptions to filter on. Input is a partial name or keyword,
            output is the most relevant matches from the database. For vendors, always use the EXACT vendor name
            from the results when constructing your SQL query.
            
            Args:
                query: Partial vendor name, description keyword, or search term
                
            Returns:
                List of matching vendor names and descriptions
            """
            try:
                # Search for similar vendor names and descriptions
                results = proper_nouns_store.similarity_search_with_score(
                    query=query,
                    k=5
                )
                
                if not results:
                    return f"No matching vendors or descriptions found for: {query}"
                
                vendors = []
                descriptions = []
                
                for doc, score in results:
                    if doc.metadata.get("type") == "vendor":
                        vendors.append(f"'{doc.metadata['text']}' (score: {score:.2f})")
                    elif doc.metadata.get("type") == "description":
                        descriptions.append(f"'{doc.metadata['text']}' (score: {score:.2f})")
                
                result = []
                if vendors:
                    result.append("VENDOR NAMES:")
                    result.extend(vendors)
                
                if descriptions:
                    if vendors:  # Add separator if we have both
                        result.append("\nDESCRIPTIONS:")
                    else:
                        result.append("DESCRIPTIONS:")
                    result.extend(descriptions)
                
                return "\n".join(result)
                
            except Exception as e:
                return f"Error searching proper nouns: {str(e)}"
        
        # Create dynamic search similar SQL patterns tool
        def create_search_similar_sql_patterns_tool(vectorstore):
            @tool
            def search_similar_sql_patterns_dynamic(task_description: str) -> str:
                """
                Search for similar SQL query patterns from previous successful queries.
                
                Use this tool when:
                - You need examples of specific SQL patterns or syntax
                - You encounter complex queries you haven't seen before  
                - Your first SQL attempt fails and you need alternative approaches
                - The user question is ambiguous and examples would help clarify the pattern
                
                IMPORTANT: Always use complete, descriptive phrases when searching.
                If user asks incomplete questions like "bottom 3?", expand to full context 
                like "bottom 3 regions by total invoice amount" before searching.
                
                Args:
                    task_description: Complete description of what you're trying to accomplish
                    
                Returns:
                    Formatted examples with similar questions and their SQL queries
                """
                try:
                    import asyncio
                    # Run the async function
                    examples = asyncio.run(get_similar_queries(vectorstore, task_description, top_k=3, min_score=0.4, max_score=0.95))
                    
                    if not examples:
                        return "No similar SQL patterns found for this type of query."
                    
                    result = "Here are similar SQL patterns from previous queries:\n\n"
                    for i, example in enumerate(examples, 1):
                        result += f"Example {i}:\n"
                        result += f"Question: {example['question']}\n"
                        result += f"SQL Query: {example['sql_query']}\n"
                        result += f"Similarity Score: {example['similarity_score']:.2f}\n\n"
                    
                    result += "Use these examples as reference for structuring your SQL query.\n"
                    return result
                    
                except Exception as e:
                    return f"Error searching for similar patterns: {str(e)}"
            
            return search_similar_sql_patterns_dynamic
        
        # Create report generation tool
        @tool
        def get_report(session_id: str) -> str:
            """
            Returns a report for the session id in question.
            """
            return f"report_{session_id}.xlsx"
        
        return [search_proper_nouns, create_search_similar_sql_patterns_tool(vectorstore), get_report]
    
    except Exception as e:
        logger.error(f"{Colors.RED}Error setting up agent tools: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Error setting up agent tools: {str(e)}")

async def create_system_prompt(table_names):
    """Create the enhanced system prompt with mandatory workflow"""
    
    system = f"""You are an agent designed to interact with a MS SQL database.
Given an input question, create a syntactically correct MS SQL query to run, then look at the results of the query and return the answer. Generate one comprehensive MS SQL query to answer the input question.

IMPORTANT: Always use the exact column names from the database schema. Common column mappings:
- For invoice amounts, use the column "invoice_total" (not amount, total, or price)
- For company names, use the column "vendor" (not vendor_name, company, or supplier)

MANDATORY WORKFLOW:
1. FIRST: Always use the "search_similar_sql_patterns_dynamic" tool to find examples of similar queries
2. Use a complete, descriptive, and rephrased version of the user's question when searching
3. THEN: Create your SQL query based on the examples and database schema
4. Execute the query and return results

TOOL USAGE FOR SIMILAR QUERIES:
You MUST use the "search_similar_sql_patterns_dynamic" tool for EVERY user question before writing SQL.

CRITICAL: Always rephrase the user's question into a complete, descriptive search term:
- User: "bottom 3?" → search for "bottom 3 regions by total invoice amount"
- User: "what about ADP?" → search for "queries about ADP vendor invoice analysis" 
- User: "group them" → search for "group by analysis for invoice data"
- User: "total invoices?" → search for "count total number of invoices"
- User: "Give me top vendors" → search for "top vendors by invoice amount analysis"

MANDATORY WORKFLOW EXAMPLE:
User: "Show me vendor performance"
Step 1: search_similar_sql_patterns_dynamic("vendor performance analysis by invoice amounts and metrics")
Step 2: [Review examples from tool]
Step 3: Create SQL query based on examples and schema
Step 4: Execute query

User: "bottom 5?"
Step 1: search_similar_sql_patterns_dynamic("bottom 5 vendors by total invoice amount")  
Step 2: [Review examples from tool]
Step 3: Create appropriate SQL query
Step 4: Execute query

You can order the results by a relevant column to return the most interesting examples in the database.

Never query for all the columns from a specific table, only ask for the relevant columns mentioned in the question.

You have access to tools for interacting with the database. Only use the given tools. Only use the information returned by the tools to construct your final answer.

You MUST double check your query before executing it. If you get an error while executing a query:
1. Look at the database schema to identify the correct column names
2. Consider using search_similar_sql_patterns_dynamic tool to find working examples
3. Rewrite the query with the correct column names
4. Try again with the corrected query

DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.

If you need to filter on a vendor name or description, you must ALWAYS first look up the exact value using the "search_proper_nouns" tool! 
ALWAYS use exact matches for vendor names when filtering.

Relevant pieces of previous conversation:
{{history}}
(You do not need to use these pieces of information if not relevant)

You have access to the following tables: {table_names}

If the question does not seem related to the database, just return "I don't know" as the answer.

{{agent_scratchpad}}
"""
    
    return system

# Function to run the SQL agent
@log_function_call
async def run_sql_agent(question, session_id, db, llm, vectorstore, qdrant_client, embeddings):
    """Run the enhanced SQL agent to answer the question"""
    try:
        # Generate a session ID if none provided
        if not session_id:
            session_id = str(uuid4())
            logger.info(f"{Colors.BLUE}Generated new session ID: {session_id}{Colors.RESET}")
        
        # Find similar previous queries for potential early return
        similar_examples = await get_similar_queries(vectorstore, question, top_k=1, min_score=0.9)
        
        # If we find a very similar question, we can return the previous answer
        # but only if the similarity is very high (direct repeat of a question)
        if similar_examples and len(similar_examples) > 0 and similar_examples[0]["similarity_score"] > 0.97:
            logger.info(f"{Colors.GREEN}Found very similar previous question, using cached answer{Colors.RESET}")
            
            # Get the metadata from Qdrant for this question
            results = vectorstore.similarity_search_with_score(
                query=question,
                k=1
            )
            
            if results:
                doc, score = results[0]
                cached_answer = doc.metadata.get("answer", "")
                cached_queries = doc.metadata.get("sql_queries", [])
                
                return {
                    "question": question,
                    "answer": cached_answer,
                    "sql_queries": cached_queries,
                    "session_id": session_id
                }
        
        # Set up the agent tools - passing the qdrant client
        try:
            tools = await setup_agent_tools(db, qdrant_client, embeddings, vectorstore)
            logger.info(f"{Colors.GREEN}Successfully set up agent tools{Colors.RESET}")
        except Exception as e:
            logger.error(f"{Colors.RED}Error setting up tools: {str(e)}{Colors.RESET}")
            # Fall back to basic set of tools if tool setup fails
            tools = []
        
        # Create system prompt with enhanced workflow
        system_prompt = await create_system_prompt(['invoices', 'invoice_line_items'])
        
        # Create the prompt template
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt), 
                ("human", "{input}"), 
                MessagesPlaceholder("agent_scratchpad")
            ]
        )
        
        # Create the agent with the updated prompt
        try:
            updated_agent_executor = create_sql_agent(
                llm=llm,
                db=db,
                prompt=prompt,
                input_variables=["input", "history", "agent_scratchpad"],
                agent_type="openai-tools", 
                verbose=True,
                use_query_checker=True,
                max_iterations=10,
                extra_tools=tools
            )
            logger.info(f"{Colors.GREEN}Successfully created SQL agent executor{Colors.RESET}")
        except Exception as e:
            logger.error(f"{Colors.RED}Error creating SQL agent executor: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error creating SQL agent executor: {str(e)}")
        
        # Set up callbacks
        handler = SQLHandler()
        
        # Set up cache per session_id
        try:
            cache = RedisChatMessageHistory(session_id, url=REDIS_URL)
            logger.info(f"{Colors.GREEN}Successfully set up Redis cache for session {session_id}{Colors.RESET}")
        except Exception as e:
            logger.error(f"{Colors.RED}Error setting up Redis cache: {str(e)}{Colors.RESET}")
            # If Redis fails, use a fallback cache
            from langchain_community.chat_message_histories import ChatMessageHistory
            cache = ChatMessageHistory()
            logger.info(f"{Colors.YELLOW}Using in-memory cache as fallback{Colors.RESET}")

        # Set up agent per cache
        try:
            agent = RunnableWithMessageHistory(
                updated_agent_executor,
                lambda sid: cache,
                input_messages_key="input",
                history_messages_key="history",
            )
            logger.info(f"{Colors.GREEN}Successfully set up agent with message history{Colors.RESET}")
        except Exception as e:
            logger.error(f"{Colors.RED}Error setting up agent with message history: {str(e)}{Colors.RESET}")
            # Fall back to direct agent executor without history if this fails
            agent = updated_agent_executor
            logger.info(f"{Colors.YELLOW}Falling back to direct agent executor without history{Colors.RESET}")

        # Invoke agent
        try:
            logger.info(f"{Colors.BLUE}Invoking agent with question: {question}{Colors.RESET}")
            if isinstance(agent, RunnableWithMessageHistory):
                response = agent.invoke(
                    {"input": question}, 
                    {"configurable": {"session_id": session_id}, "callbacks":[handler]}
                )
            else:
                response = agent.invoke(
                    {"input": question}, 
                    {"callbacks":[handler]}
                )
            
            logger.info(f"{Colors.GREEN}Agent invocation successful{Colors.RESET}")
        except Exception as e:
            logger.error(f"{Colors.RED}Error invoking agent: {str(e)}{Colors.RESET}")
            return {
                "question": question,
                "answer": f"Error processing your question: {str(e)}. Please try again or rephrase your question.",
                "sql_queries": [],
                "session_id": session_id
            }
        
        # Extract SQL commands from the handler
        try:
            sql_cmds = [q["query"] for q in handler.sql_result]
            logger.info(f"{Colors.GREEN}Extracted {len(sql_cmds)} SQL commands from handler{Colors.RESET}")
        except Exception as e:
            logger.error(f"{Colors.RED}Error extracting SQL commands: {str(e)}{Colors.RESET}")
            sql_cmds = []
        
        # Add SQL commands to response
        response['sql_cmds'] = sql_cmds
        
        # Relaxed success criteria
        has_valid_output = (
            response.get('output') and 
            "agent stopped" not in response.get('output', '').lower() and
            "error" not in response.get('output', '').lower() and
            "I don't know" not in response.get('output', '')
        )
        
        # Store results in vector DB if successful
        if handler.successful_query_executed or (len(sql_cmds) > 0 and has_valid_output):
            try:
                # Use rephrased question if available, otherwise fall back to original
                question_to_store = handler.rephrased_question or question
                
                logger.info(f"{Colors.BLUE}Storing question: '{question_to_store}' (rephrased: {bool(handler.rephrased_question)}){Colors.RESET}")
                
                await store_in_qdrant(
                    vectorstore,
                    question=question_to_store,  # Store the rephrased question
                    answer=response.get('output', ''),
                    sql_queries=response.get('sql_cmds', [])
                )
            except Exception as e:
                logger.error(f"{Colors.RED}Error storing in Qdrant: {str(e)}{Colors.RESET}")
        else:
            logger.warning(f"{Colors.YELLOW}Skipping storage of query - unsuccessful execution or invalid output{Colors.RESET}")
        
        # Return the response
        return {
            "question": question,
            "answer": response.get('output', 'No answer generated'),
            "sql_queries": response.get('sql_cmds', []),
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error running SQL agent: {str(e)}{Colors.RESET}", exc_info=True)
        return {
            "question": question,
            "answer": f"Error: {str(e)}",
            "sql_queries": [],
            "session_id": session_id or str(uuid4())
        }

@router.post("/sql-agent", response_model=SQLAgentResponse)
@log_function_call
async def query_sql_agent(
    request: Request,
    query: SQLAgentRequest = Body(...),
    db: SQLDatabase = Depends(get_database_connection),
    llm: AzureChatOpenAI = Depends(get_llm)
):
    """
    Query the enhanced SQL agent with a natural language question
    
    This endpoint accepts a natural language question about invoice data and returns
    an answer along with the SQL queries used to generate it. The agent now includes
    enhanced features like rephrased question tracking, better similarity search,
    and improved proper noun matching.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    client_ip = request.client.host if request.client else "unknown"
    question = query.question.strip()
    session_id = query.session_id or str(uuid4())
    
    logger.info(f"{Colors.BLUE}Processing enhanced SQL agent request | Question: {question} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        # Get the vector store with client and embeddings
        vectorstore, qdrant_client, embeddings = await get_vectorstore()
        
        # Look for similar questions in the database first
        similar_examples = await get_similar_queries(vectorstore, question, top_k=1, min_score=0.9)
        
        # If we find a very similar question, we can return the previous answer
        # but only if the similarity is very high (direct repeat of a question)
        if similar_examples and len(similar_examples) > 0 and similar_examples[0]["similarity_score"] > 0.97:
            logger.info(f"{Colors.GREEN}Found very similar previous question, using cached answer{Colors.RESET}")
            
            # Get the metadata from Qdrant for this question
            results = vectorstore.similarity_search_with_score(
                query=question,
                k=1
            )
            
            if results:
                doc, score = results[0]
                cached_answer = doc.metadata.get("answer", "")
                cached_queries = doc.metadata.get("sql_queries", [])
                
                log_event(
                    "sql_agent_cached",
                    "Using cached answer for very similar question",
                    {
                        "request_id": request_id,
                        "client_ip": client_ip,
                        "question": question,
                        "original_question": doc.metadata.get("question", ""),
                        "similarity": score,
                        "session_id": session_id
                    }
                )
                
                # Return the cached answer but note that it's from cache
                return SQLAgentResponse(
                    question=question,
                    answer=cached_answer,
                    sql_queries=cached_queries,
                    session_id=session_id
                )
        
        # Run the full enhanced agent if no exact match
        result = await run_sql_agent(
            question=question,
            session_id=session_id,
            db=db,
            llm=llm,
            vectorstore=vectorstore,
            qdrant_client=qdrant_client,
            embeddings=embeddings
        )
        
        # Check if we got a valid answer
        if not result["sql_queries"] or "error" in result["answer"].lower() or "agent stopped" in result["answer"].lower():
            # If the agent failed, try one more time with a refined prompt
            logger.info(f"{Colors.YELLOW}Agent failed on first attempt, trying again with refined prompt{Colors.RESET}")
            
            # Create a refined question
            refined_prompt = f"""
            I need help with a database query. The database has tables for invoices and invoice_line_items.
            My question is: "{question}"
            
            Please convert this to a clear SQL query that would run against these tables.
            The invoices table has columns like: id, invoice_number, vendor, invoice_total, region, country
            The invoice_line_items table has columns like: id, invoice_id, description, quantity, unit_price, total_price
            """
            
            # Try the agent again with the refined prompt
            retry_result = await run_sql_agent(
                question=refined_prompt,
                session_id=session_id,
                db=db,
                llm=llm,
                vectorstore=vectorstore,
                qdrant_client=qdrant_client,
                embeddings=embeddings
            )
            
            # Use the retry result if it has SQL queries
            if retry_result["sql_queries"]:
                result = retry_result
        
        # Log success
        log_event(
            "sql_agent_query",
            "Enhanced SQL agent query processed",
            {
                "request_id": request_id,
                "client_ip": client_ip,
                "question": question,
                "session_id": result["session_id"],
                "sql_queries_count": len(result["sql_queries"]),
                "success": len(result["sql_queries"]) > 0 and "error" not in result["answer"].lower(),
                "features_used": {
                    "rephrased_question": bool(result.get("rephrased_question")),
                    "similar_queries_found": len(similar_examples) > 0,
                    "cached_response": False
                }
            }
        )
        
        # Return the result
        return SQLAgentResponse(**result)
    
    except Exception as e:
        # Log error
        logger.error(f"{Colors.RED}Enhanced SQL agent query failed | Question: {question} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        return SQLAgentResponse(
            question=question,
            answer=f"Error processing your question: {str(e)}. Please try again or rephrase your question.",
            sql_queries=[],
            session_id=session_id
        )
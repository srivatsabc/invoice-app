-- Drop existing tables
DROP TABLE IF EXISTS invoice_files;
DROP TABLE IF EXISTS invoice_line_items;
DROP TABLE IF EXISTS invoice_headers;

-- Create invoice headers table with all required fields including tax
CREATE TABLE invoice_headers (
    id VARCHAR(36) PRIMARY KEY,
    supplier_name NVARCHAR(500),
	brand_name NVARCHAR(500),
    invoice_type NVARCHAR(100),
    invoice_number NVARCHAR(100) NOT NULL,
    issue_date DATE,
    due_date DATE,                           -- NEW: due date field
    tax_point_date DATE,                     -- NEW: tax point date field
    invoice_receipt_date DATE,
    po_number NVARCHAR(100),
    supplier_tax_id NVARCHAR(100),
    buyer_company_reg_id NVARCHAR(100),      -- NEW: buyer company registration ID
    buyer_tax_id NVARCHAR(100),
    supplier_details NVARCHAR(MAX),
    supplier_country_code NVARCHAR(10),
    buyer_details NVARCHAR(MAX),
    buyer_country_code NVARCHAR(10),
    ship_to_details NVARCHAR(MAX),           -- NEW: ship to address
    ship_to_country_code NVARCHAR(10),       -- NEW: ship to country
    payment_information NVARCHAR(MAX),       -- NEW: payment information
    payment_terms NVARCHAR(500),             -- NEW: payment terms
    subtotal DECIMAL(18,2),                  -- net amount before tax
    tax DECIMAL(18,2),                       -- NEW: tax amount
    total DECIMAL(18,2),                     -- gross amount (subtotal + tax)
    currency NVARCHAR(10),
    notes NVARCHAR(MAX),                     -- NEW: invoice notes
    delivery_note NVARCHAR(500),
    exchange_rate DECIMAL(18,6),
    system_routing NVARCHAR(20),
    region NVARCHAR(100),                    -- from JSON
    status NVARCHAR(50) DEFAULT 'Extracted', -- default value
    feedback NVARCHAR(10) DEFAULT 'No',      -- default value
    -- Metadata fields
    extraction_method NVARCHAR(100),
    processing_method NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

ALTER TABLE invoice_headers ALTER COLUMN invoice_number NVARCHAR(100) NULL;

-- Create line items table with enhanced fields
CREATE TABLE invoice_line_items (
    id VARCHAR(36) PRIMARY KEY,
    invoice_header_id VARCHAR(36) NOT NULL,
    line_number NVARCHAR(100),               -- from JSON
    item_number NVARCHAR(100),               -- NEW: item number from JSON
    item_code NVARCHAR(100),
    description NVARCHAR(MAX),
    quantity DECIMAL(18,6),
    unit_of_measure NVARCHAR(100),
    unit_price DECIMAL(18,6),
    amount DECIMAL(18,2),                    -- NEW: amount per line from JSON
    price_per DECIMAL(18,6),
    amount_gross_per_line DECIMAL(18,2),
    amount_net_per_line DECIMAL(18,2),
    tax_amount_per_line DECIMAL(18,2),
    tax_rate DECIMAL(5,2),                   -- percentage with 2 decimal places
    delivery_note NVARCHAR(500),
    material_number NVARCHAR(100),
    customer_po NVARCHAR(100),
    po_number NVARCHAR(100),                 -- NEW: PO number per line item
    currency_per_line NVARCHAR(10),
    is_additional_charge BIT DEFAULT 0,      -- flag for additional charges
    -- Metadata fields
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_line_items_header FOREIGN KEY (invoice_header_id) REFERENCES invoice_headers(id)
);

-- Create indexes for better performance
CREATE INDEX IX_invoice_headers_invoice_number ON invoice_headers(invoice_number);
CREATE INDEX IX_invoice_headers_supplier_name ON invoice_headers(supplier_name);
CREATE INDEX IX_invoice_headers_issue_date ON invoice_headers(issue_date);
CREATE INDEX IX_invoice_headers_due_date ON invoice_headers(due_date);        -- NEW: index on due date
CREATE INDEX IX_invoice_headers_status ON invoice_headers(status);
CREATE INDEX IX_invoice_headers_region ON invoice_headers(region);
CREATE INDEX IX_line_items_header_id ON invoice_line_items(invoice_header_id);
CREATE INDEX IX_line_items_item_code ON invoice_line_items(item_code);
CREATE INDEX IX_line_items_item_number ON invoice_line_items(item_number);    -- NEW: index on item number

-- Create invoice_files table to store base64 content instead of file paths
CREATE TABLE invoice_files (
    invoice_header_id VARCHAR(36) NOT NULL,
    original_file_path NVARCHAR(MAX),           -- Keep original path for reference (using MAX)
    file_base64_content NVARCHAR(MAX),          -- NEW: Store base64 content here (using MAX)
    file_name NVARCHAR(255),                    -- NEW: Store just the filename
    file_size BIGINT,                           -- NEW: Store file size in bytes
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT PK_invoice_files PRIMARY KEY (invoice_header_id),
    CONSTRAINT FK_invoice_files_header FOREIGN KEY (invoice_header_id) REFERENCES invoice_headers(id) ON DELETE CASCADE
);

-- Create index for better performance (removed file_path index since we're storing base64)
CREATE INDEX IX_invoice_files_filename ON invoice_files(file_name);


select * from invoice_headers

select * from invoice_line_items

select * from invoice_files


-- Step 1: Drop the existing table
DROP TABLE prompt_registry;

-- Step 2: Recreate the table with proper versioning support and new region/country columns
CREATE TABLE prompt_registry (
    id INT IDENTITY(1,1) PRIMARY KEY,
    brand_name NVARCHAR(255) NOT NULL,
    processing_method NVARCHAR(50) NOT NULL, -- 'text', 'image', or 'both'
    region_code NVARCHAR(10) NOT NULL,
    region_name NVARCHAR(100) NOT NULL,
    country_code NVARCHAR(10) NOT NULL,
    country_name NVARCHAR(100) NOT NULL,
    schema_json NVARCHAR(MAX) NULL, -- JSON schema as string
    prompt NVARCHAR(MAX) NULL, -- Extraction prompt/instructions
    special_instructions NVARCHAR(MAX) NULL, -- Additional processing instructions
    feedback NVARCHAR(MAX) NULL, -- Performance feedback and notes
    is_active BIT NOT NULL DEFAULT 1, -- Enable/disable configuration
    version INT NOT NULL DEFAULT 1, -- Version control for configurations
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by NVARCHAR(255) NULL,
    updated_by NVARCHAR(255) NULL
);

-- Step 3: Add constraint to ensure only one active version per brand/method/region/country combination
CREATE UNIQUE INDEX IX_prompt_registry_brand_method_region_active 
ON prompt_registry (brand_name, processing_method, region_code, country_code) 
WHERE is_active = 1;

-- Step 4: Add constraint to ensure unique version numbers per brand/method/region/country combination
ALTER TABLE prompt_registry 
ADD CONSTRAINT UK_prompt_registry_brand_method_region_version 
UNIQUE (brand_name, processing_method, region_code, country_code, version);

-- Step 5: Add performance indexes
CREATE INDEX IX_prompt_registry_brand_method_region_version 
ON prompt_registry (brand_name, processing_method, region_code, country_code, version);

CREATE INDEX IX_prompt_registry_active 
ON prompt_registry (is_active, brand_name, processing_method, region_code, country_code);

CREATE INDEX IX_prompt_registry_region_country 
ON prompt_registry (region_code, country_code);

drop table brand_feedback

-- Create brand_feedback table
CREATE TABLE brand_feedback (
    id INT IDENTITY(1,1) PRIMARY KEY,
    region_code NVARCHAR(10) NOT NULL,
    country_code NVARCHAR(10) NOT NULL,
    brand_name NVARCHAR(255) NOT NULL,
    feedback NVARCHAR(MAX) NULL,
    rating INT NULL CHECK (rating >= 1 AND rating <= 5),
    category NVARCHAR(100) NULL, -- e.g., 'quality', 'service', 'accuracy', 'performance'
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by NVARCHAR(255) NULL,
    updated_by NVARCHAR(255) NULL,
    
    -- Create unique constraint on region/country/brand combination
    CONSTRAINT UK_brand_feedback_region_country_brand 
    UNIQUE (region_code, country_code, brand_name)
);

-- Create indexes for better performance
CREATE INDEX IX_brand_feedback_region_country 
ON brand_feedback (region_code, country_code);

CREATE INDEX IX_brand_feedback_brand_name 
ON brand_feedback (brand_name);

CREATE INDEX IX_brand_feedback_rating 
ON brand_feedback (rating);

CREATE INDEX IX_brand_feedback_category 
ON brand_feedback (category);

DROP table agent_control_center

-- Create the agent_control_center table
CREATE TABLE agent_control_center (
    id INT IDENTITY(1,1) PRIMARY KEY,
    control NVARCHAR(255) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    value NVARCHAR(500) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by NVARCHAR(255) NULL,
    updated_by NVARCHAR(255) NULL
);

-- Insert the initial logging control entry
INSERT INTO agent_control_center (control, is_active, value, created_by) 
VALUES ('logging', 1, 'INFO', 'system');

DROP table agent_control_center_logs

-- Create the agent_control_center_logs table
CREATE TABLE agent_control_center_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    transaction_id NVARCHAR(50) NULL,
    log NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE INDEX IX_agent_control_center_logs_transaction_id 
ON agent_control_center_logs (transaction_id);
-- Invoice Headers for NA Region - First Half 2024
INSERT INTO invoice_headers (
    id, supplier_name, invoice_type, invoice_number, issue_date, invoice_receipt_date,
    po_number, supplier_tax_id, buyer_tax_id, supplier_details, supplier_country_code,
    buyer_details, buyer_country_code, subtotal, total, currency, delivery_note,
    exchange_rate, system_routing, region, status, feedback, extraction_method, 
    processing_method, created_at, updated_at
) VALUES 
-- 1. US Tech Supplier
('11111111-1111-1111-1111-111111111111', 'Microsoft Corporation', 'Commercial', 'US2024001', '2024-01-15', '2024-01-16', 'PO-2024-001', 'US123456789', 'CA987654321', 'Microsoft Corporation, One Microsoft Way, Redmond, WA 98052, USA', 'US', 'Shopify Inc, 150 Elgin Street, Ottawa, ON K2P 1L4, Canada', 'CA', 45000.00, 49500.00, 'USD', 'UPS Express', 1.3400, 'SOFTWARE', 'NA', 'Extracted', 'No', 'vision_per_invoice', 'image', '2024-01-16 09:30:00', '2024-01-16 09:30:00'),

-- 2. Canadian Manufacturing
('22222222-2222-2222-2222-222222222222', 'Magna International Inc', 'Commercial', 'CA2024002', '2024-02-20', '2024-02-21', 'PO-2024-002', 'CA123456789', 'US987654321', 'Magna International Inc, 337 Magna Drive, Aurora, ON L4G 7K1, Canada', 'CA', 'General Motors Company, 300 Renaissance Center, Detroit, MI 48265, USA', 'US', 87500.00, 96250.00, 'CAD', 'FedEx Ground', 0.7460, 'AUTO-PARTS', 'NA', 'Extracted', 'No', 'text_per_page', 'text', '2024-02-21 14:15:00', '2024-02-21 14:15:00'),

-- 3. Mexican Supplier
('33333333-3333-3333-3333-333333333333', 'Cemex SAB de CV', 'Commercial', 'MX2024003', '2024-03-10', '2024-03-12', 'PO-2024-003', 'MX12345678901', 'US123456789', 'CEMEX S.A.B. de C.V., Av. Ricardo Margáin Zozaya 325, San Pedro Garza García, NL 66265, Mexico', 'MX', 'Caterpillar Inc, 510 Lake Cook Road, Deerfield, IL 60015, USA', 'US', 156000.00, 181440.00, 'MXN', 'DHL Express', 18.2500, 'CONSTRUCTION', 'NA', 'Extracted', 'No', 'vision_per_page', 'image', '2024-03-12 11:45:00', '2024-03-12 11:45:00'),

-- 4. US Food & Beverage
('44444444-4444-4444-4444-444444444444', 'PepsiCo Inc', 'Commercial', 'US2024004', '2024-04-05', '2024-04-06', 'PO-2024-004', 'US456789123', 'CA456789123', 'PepsiCo Inc, 700 Anderson Hill Road, Purchase, NY 10577, USA', 'US', 'Loblaws Companies Limited, 1 Presidents Choice Circle, Brampton, ON L6Y 5S5, Canada', 'CA', 28750.00, 30937.50, 'USD', 'Canada Post Express', 1.3400, 'FOOD-BEV', 'NA', 'Extracted', 'No', 'text_per_invoice', 'text', '2024-04-06 16:20:00', '2024-04-06 16:20:00'),

-- 5. Canadian Energy
('55555555-5555-5555-5555-555555555555', 'Suncor Energy Inc', 'Commercial', 'CA2024005', '2024-05-12', '2024-05-13', 'PO-2024-005', 'CA789123456', 'US789123456', 'Suncor Energy Inc, 150 6 Avenue SW, Calgary, AB T2P 3E3, Canada', 'CA', 'ExxonMobil Corporation, 5959 Las Colinas Boulevard, Irving, TX 75039, USA', 'US', 234000.00, 257400.00, 'CAD', 'Purolator Express', 0.7460, 'ENERGY', 'NA', 'Extracted', 'No', 'vision_per_invoice', 'image', '2024-05-13 08:15:00', '2024-05-13 08:15:00'),

-- 6. US Pharmaceutical
('66666666-6666-6666-6666-666666666666', 'Johnson & Johnson', 'Commercial', 'US2024006', '2024-06-18', '2024-06-19', 'PO-2024-006', 'US321654987', 'MX321654987', 'Johnson & Johnson, One Johnson & Johnson Plaza, New Brunswick, NJ 08933, USA', 'US', 'Farmacias Guadalajara SA de CV, Av. Javier Mina 1515, Guadalajara, JAL 44100, Mexico', 'MX', 67500.00, 78000.00, 'USD', 'DHL International', 18.2500, 'PHARMA', 'NA', 'Extracted', 'No', 'text_per_page', 'text', '2024-06-19 13:40:00', '2024-06-19 13:40:00'),

-- 7. Mexican Telecommunications
('77777777-7777-7777-7777-777777777777', 'América Móvil SAB de CV', 'Commercial', 'MX2024007', '2024-01-25', '2024-01-26', 'PO-2024-007', 'MX987654321', 'US654321987', 'América Móvil S.A.B. de C.V., Lago Zurich 245, Ampliación Granada, CDMX 11529, Mexico', 'MX', 'Verizon Communications Inc, 1095 Avenue of the Americas, New York, NY 10036, USA', 'US', 189000.00, 219420.00, 'MXN', 'FedEx International', 18.2500, 'TELECOM', 'NA', 'Extracted', 'No', 'vision_per_invoice', 'image', '2024-01-26 10:25:00', '2024-01-26 10:25:00'),

-- 8. US Aerospace
('88888888-8888-8888-8888-888888888888', 'Boeing Company', 'Commercial', 'US2024008', '2024-02-28', '2024-03-01', 'PO-2024-008', 'US147258369', 'CA147258369', 'The Boeing Company, 100 North Riverside Plaza, Chicago, IL 60606, USA', 'US', 'Bombardier Inc, 400 Côte-Vertu Road West, Dorval, QC H4S 1Y9, Canada', 'CA', 567000.00, 623700.00, 'USD', 'UPS Worldwide Express', 1.3400, 'AEROSPACE', 'NA', 'Extracted', 'No', 'text_per_invoice', 'text', '2024-03-01 15:10:00', '2024-03-01 15:10:00'),

-- 9. Canadian Mining
('99999999-9999-9999-9999-999999999999', 'Barrick Gold Corporation', 'Commercial', 'CA2024009', '2024-04-14', '2024-04-15', 'PO-2024-009', 'CA369258147', 'US369258147', 'Barrick Gold Corporation, 161 Bay Street, Toronto, ON M5J 2S1, Canada', 'CA', 'Newmont Corporation, 6900 E Layton Avenue, Denver, CO 80237, USA', 'US', 345000.00, 379500.00, 'CAD', 'Canada Post Priority', 0.7460, 'MINING', 'NA', 'Extracted', 'No', 'vision_per_page', 'image', '2024-04-15 12:55:00', '2024-04-15 12:55:00'),

-- 10. US Retail
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Walmart Inc', 'Commercial', 'US2024010', '2024-05-30', '2024-05-31', 'PO-2024-010', 'US258147369', 'MX258147369', 'Walmart Inc, 702 SW 8th Street, Bentonville, AR 72716, USA', 'US', 'Grupo Comercial Chedraui SA de CV, Av. Teziutlán Sur 30, Puebla, PUE 72530, Mexico', 'MX', 125000.00, 145000.00, 'USD', 'UPS Standard', 18.2500, 'RETAIL', 'NA', 'Extracted', 'No', 'text_per_page', 'text', '2024-05-31 09:00:00', '2024-05-31 09:00:00');

-- Line Items for NA Region Invoices (Corrected UUIDs)
INSERT INTO invoice_line_items (
    id, invoice_header_id, item_code, description, quantity, unit_of_measure,
    unit_price, price_per, amount_gross_per_line, amount_net_per_line,
    tax_amount_per_line, tax_rate, line_number, delivery_note, material_number,
    customer_po, currency_per_line, is_additional_charge, created_at, updated_at
) VALUES 
-- Line items for Microsoft invoice
('11111111-1111-1111-1111-11111111111a', '11111111-1111-1111-1111-111111111111', 'MS-365-E5', 'Microsoft 365 Enterprise E5 License', 100.00, 'LICENSE', 450.00, 1.00, 49500.00, 45000.00, 4500.00, 10.00, '001', 'Digital Delivery', 'MAT-365-E5', 'PO-2024-001', 'USD', 0, '2024-01-16 09:30:00', '2024-01-16 09:30:00'),

-- Line items for Magna invoice
('22222222-2222-2222-2222-22222222222a', '22222222-2222-2222-2222-222222222222', 'BRAKE-PAD-001', 'Ceramic Brake Pad Assembly', 500.00, 'UNIT', 175.00, 1.00, 96250.00, 87500.00, 8750.00, 10.00, '001', 'Truck Delivery', 'MAT-BP-001', 'PO-2024-002', 'CAD', 0, '2024-02-21 14:15:00', '2024-02-21 14:15:00'),

-- Line items for Cemex invoice
('33333333-3333-3333-3333-33333333333a', '33333333-3333-3333-3333-333333333333', 'CEMENT-50KG', 'Portland Cement Type I 50kg Bag', 2000.00, 'BAG', 78.00, 1.00, 181440.00, 156000.00, 25440.00, 16.31, '001', 'Bulk Truck Delivery', 'MAT-CEM-50', 'PO-2024-003', 'MXN', 0, '2024-03-12 11:45:00', '2024-03-12 11:45:00'),

-- Line items for PepsiCo invoice
('44444444-4444-4444-4444-44444444444a', '44444444-4444-4444-4444-444444444444', 'PEPSI-24PK', 'Pepsi Cola 355ml 24-Pack Case', 250.00, 'CASE', 115.00, 1.00, 30937.50, 28750.00, 2187.50, 7.61, '001', 'Refrigerated Truck', 'MAT-PEPSI-24', 'PO-2024-004', 'USD', 0, '2024-04-06 16:20:00', '2024-04-06 16:20:00'),

-- Line items for Suncor invoice
('55555555-5555-5555-5555-55555555555a', '55555555-5555-5555-5555-555555555555', 'CRUDE-BARREL', 'Light Sweet Crude Oil Barrel', 3000.00, 'BARREL', 78.00, 1.00, 257400.00, 234000.00, 23400.00, 10.00, '001', 'Pipeline Delivery', 'MAT-CRUDE-LSC', 'PO-2024-005', 'CAD', 0, '2024-05-13 08:15:00', '2024-05-13 08:15:00'),

-- Line items for Johnson & Johnson invoice
('66666666-6666-6666-6666-66666666666a', '66666666-6666-6666-6666-666666666666', 'TYLENOL-500MG', 'Tylenol Extra Strength 500mg 100-Count Bottle', 750.00, 'BOTTLE', 90.00, 1.00, 78000.00, 67500.00, 10500.00, 15.56, '001', 'Cold Chain Express', 'MAT-TYL-500', 'PO-2024-006', 'USD', 0, '2024-06-19 13:40:00', '2024-06-19 13:40:00'),

-- Line items for América Móvil invoice
('77777777-7777-7777-7777-77777777777a', '77777777-7777-7777-7777-777777777777', 'ROUTER-5G', '5G Enterprise Router Unit', 450.00, 'UNIT', 420.00, 1.00, 219420.00, 189000.00, 30420.00, 16.10, '001', 'Express Delivery', 'MAT-5G-RTR', 'PO-2024-007', 'MXN', 0, '2024-01-26 10:25:00', '2024-01-26 10:25:00'),

-- Line items for Boeing invoice
('88888888-8888-8888-8888-88888888888a', '88888888-8888-8888-8888-888888888888', 'ENGINE-CFM56', 'CFM56-7B Engine Assembly', 5.00, 'UNIT', 113400.00, 1.00, 623700.00, 567000.00, 56700.00, 10.00, '001', 'Air Freight Special', 'MAT-CFM56-7B', 'PO-2024-008', 'USD', 0, '2024-03-01 15:10:00', '2024-03-01 15:10:00'),

-- Line items for Barrick Gold invoice
('99999999-9999-9999-9999-99999999999a', '99999999-9999-9999-9999-999999999999', 'MINING-EQUIP', 'Heavy Mining Equipment Parts Kit', 15.00, 'KIT', 23000.00, 1.00, 379500.00, 345000.00, 34500.00, 10.00, '001', 'Heavy Haul Transport', 'MAT-MINE-KIT', 'PO-2024-009', 'CAD', 0, '2024-04-15 12:55:00', '2024-04-15 12:55:00'),

-- Line items for Walmart invoice
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa0a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GROCERY-MIX', 'Mixed Grocery Products Pallet', 125.00, 'PALLET', 1000.00, 1.00, 145000.00, 125000.00, 20000.00, 16.00, '001', 'Standard Truck Delivery', 'MAT-GROC-MIX', 'PO-2024-010', 'USD', 0, '2024-05-31 09:00:00', '2024-05-31 09:00:00');

-- Invoice Headers for NA Region - 20 Records for 2024
INSERT INTO invoice_headers (
    id, supplier_name, invoice_type, invoice_number, issue_date, invoice_receipt_date,
    po_number, supplier_tax_id, buyer_tax_id, supplier_details, supplier_country_code,
    buyer_details, buyer_country_code, subtotal, total, currency, delivery_note,
    exchange_rate, system_routing, region, status, feedback, extraction_method, 
    processing_method, created_at, updated_at
) VALUES 
-- 1. Apple Inc
('a1111111-1111-1111-1111-111111111111', 'Apple Inc', 'Commercial', 'US2024011', '2024-01-08', '2024-01-09', 'PO-2024-011', 'US111222333', 'CA555666777', 'Apple Inc, One Apple Park Way, Cupertino, CA 95014, USA', 'US', 'Best Buy Canada Ltd, 8800 Glenlyon Parkway, Burnaby, BC V5J 5K3, Canada', 'CA', 125000.00, 137500.00, 'USD', 'FedEx Priority', 1.3400, 'ELECTRONICS', 'NA', 'Approved', 'No', 'vision_per_invoice', 'image', '2024-01-09 10:15:00', '2024-01-09 10:15:00'),

-- 2. Shopify Inc
('a2222222-2222-2222-2222-222222222222', 'Shopify Inc', 'Commercial', 'CA2024012', '2024-01-22', '2024-01-23', 'PO-2024-012', 'CA444555666', 'US777888999', 'Shopify Inc, 150 Elgin Street, Ottawa, ON K2P 1L4, Canada', 'CA', 'Square Inc, 1455 Market Street, San Francisco, CA 94103, USA', 'US', 85000.00, 93500.00, 'CAD', 'Canada Post Express', 0.7460, 'SOFTWARE', 'NA', 'Completed', 'No', 'text_per_page', 'text', '2024-01-23 14:30:00', '2024-01-23 14:30:00'),

-- 3. Grupo Bimbo
('a3333333-3333-3333-3333-333333333333', 'Grupo Bimbo SAB de CV', 'Commercial', 'MX2024013', '2024-02-05', '2024-02-06', 'PO-2024-013', 'MX123987456', 'US456123789', 'Grupo Bimbo S.A.B. de C.V., Prolongación Paseo de la Reforma 1000, Ciudad de México, CDMX 01210, Mexico', 'MX', 'General Mills Inc, Number One General Mills Boulevard, Minneapolis, MN 55426, USA', 'US', 67500.00, 78300.00, 'MXN', 'DHL Express', 18.2500, 'FOOD-BEV', 'NA', 'Processed', 'No', 'vision_per_page', 'image', '2024-02-06 09:45:00', '2024-02-06 09:45:00'),

-- 4. Amazon.com Inc
('a4444444-4444-4444-4444-444444444444', 'Amazon.com Inc', 'Commercial', 'US2024014', '2024-02-18', '2024-02-19', 'PO-2024-014', 'US789456123', 'MX654789321', 'Amazon.com Inc, 410 Terry Avenue North, Seattle, WA 98109, USA', 'US', 'MercadoLibre Inc, Arias 3751, Buenos Aires C1430CRG, Argentina', 'MX', 234000.00, 257400.00, 'USD', 'Amazon Logistics', 18.2500, 'LOGISTICS', 'NA', 'Approved', 'No', 'text_per_invoice', 'text', '2024-02-19 16:20:00', '2024-02-19 16:20:00'),

-- 5. BlackBerry Limited
('a5555555-5555-5555-5555-555555555555', 'BlackBerry Limited', 'Commercial', 'CA2024015', '2024-03-02', '2024-03-03', 'PO-2024-015', 'CA987321654', 'US321987654', 'BlackBerry Limited, 2200 University Avenue East, Waterloo, ON N2K 0A7, Canada', 'CA', 'IBM Corporation, 1 New Orchard Road, Armonk, NY 10504, USA', 'US', 156000.00, 171600.00, 'CAD', 'Purolator Express', 0.7460, 'CYBERSECURITY', 'NA', 'Completed', 'No', 'vision_per_invoice', 'image', '2024-03-03 11:10:00', '2024-03-03 11:10:00'),

-- 6. Grupo Televisa
('a6666666-6666-6666-6666-666666666666', 'Grupo Televisa SAB', 'Commercial', 'MX2024016', '2024-03-15', '2024-03-16', 'PO-2024-016', 'MX654321987', 'CA147852963', 'Grupo Televisa S.A.B., Av. Vasco de Quiroga 2000, Ciudad de México, CDMX 01210, Mexico', 'MX', 'Rogers Communications Inc, 333 Bloor Street East, Toronto, ON M4W 1G9, Canada', 'CA', 198000.00, 229680.00, 'MXN', 'FedEx International', 0.0728, 'MEDIA', 'NA', 'Processed', 'No', 'text_per_page', 'text', '2024-03-16 13:25:00', '2024-03-16 13:25:00'),

-- 7. Intel Corporation
('a7777777-7777-7777-7777-777777777777', 'Intel Corporation', 'Commercial', 'US2024017', '2024-04-01', '2024-04-02', 'PO-2024-017', 'US852963741', 'MX741852963', 'Intel Corporation, 2200 Mission College Blvd, Santa Clara, CA 95054, USA', 'US', 'Telmex Internacional SAB de CV, Parque Vía 190, Ciudad de México, CDMX 01210, Mexico', 'MX', 89000.00, 103240.00, 'USD', 'UPS Worldwide Express', 18.2500, 'SEMICONDUCTORS', 'NA', 'Approved', 'No', 'vision_per_page', 'image', '2024-04-02 08:40:00', '2024-04-02 08:40:00'),

-- 8. Canadian National Railway
('a8888888-8888-8888-8888-888888888888', 'Canadian National Railway Company', 'Commercial', 'CA2024018', '2024-04-20', '2024-04-21', 'PO-2024-018', 'CA963741852', 'US159357486', 'Canadian National Railway Company, 935 de La Gauchetière Street West, Montreal, QC H3B 2M9, Canada', 'CA', 'Union Pacific Corporation, 1400 Douglas Street, Omaha, NE 68179, USA', 'US', 345000.00, 379500.00, 'CAD', 'Rail Transport', 0.7460, 'TRANSPORTATION', 'NA', 'Completed', 'No', 'text_per_invoice', 'text', '2024-04-21 15:55:00', '2024-04-21 15:55:00'),

-- 9. Coca-Cola FEMSA
('a9999999-9999-9999-9999-999999999999', 'Coca-Cola FEMSA SAB de CV', 'Commercial', 'MX2024019', '2024-05-05', '2024-05-06', 'PO-2024-019', 'MX753951486', 'US486159753', 'Coca-Cola FEMSA S.A.B. de C.V., Mario Pani 100, Ciudad de México, CDMX 05348, Mexico', 'MX', 'The Coca-Cola Company, One Coca-Cola Plaza, Atlanta, GA 30313, USA', 'US', 167000.00, 193720.00, 'MXN', 'DHL International', 18.2500, 'BEVERAGES', 'NA', 'Processed', 'No', 'vision_per_invoice', 'image', '2024-05-06 12:30:00', '2024-05-06 12:30:00'),

-- 10. Tesla Inc
('ab111111-1111-1111-1111-111111111111', 'Tesla Inc', 'Commercial', 'US2024020', '2024-05-25', '2024-05-26', 'PO-2024-020', 'US159486753', 'CA753486159', 'Tesla Inc, 1 Tesla Road, Austin, TX 78725, USA', 'US', 'Magna International Inc, 337 Magna Drive, Aurora, ON L4G 7K1, Canada', 'CA', 567000.00, 623700.00, 'USD', 'Tesla Logistics', 1.3400, 'AUTOMOTIVE', 'NA', 'Approved', 'No', 'text_per_page', 'text', '2024-05-26 14:45:00', '2024-05-26 14:45:00'),

-- 11. Alimentation Couche-Tard
('ab222222-2222-2222-2222-222222222222', 'Alimentation Couche-Tard Inc', 'Commercial', 'CA2024021', '2024-06-10', '2024-06-11', 'PO-2024-021', 'CA486753159', 'US357159486', '4204 Boulevard Industriel, Laval, QC H7L 0E2, Canada', 'CA', '7-Eleven Inc, One Arts Plaza, Dallas, TX 75201, USA', 'US', 78500.00, 86350.00, 'CAD', 'Truck Transport', 0.7460, 'RETAIL', 'NA', 'Completed', 'No', 'vision_per_page', 'image', '2024-06-11 10:20:00', '2024-06-11 10:20:00'),

-- 12. Grupo Carso
('ab333333-3333-3333-3333-333333333333', 'Grupo Carso SAB de CV', 'Commercial', 'MX2024022', '2024-07-02', '2024-07-03', 'PO-2024-022', 'MX159753486', 'CA486357159', 'Grupo Carso S.A.B. de C.V., Lago Zurich 245, Ciudad de México, CDMX 11529, Mexico', 'MX', 'Canadian Pacific Railway Limited, 7550 Ogden Dale Road SE, Calgary, AB T2C 4X9, Canada', 'CA', 289000.00, 335240.00, 'MXN', 'Rail & Truck Combo', 0.0728, 'INFRASTRUCTURE', 'NA', 'Processed', 'No', 'text_per_invoice', 'text', '2024-07-03 09:15:00', '2024-07-03 09:15:00'),

-- 13. Netflix Inc
('ab444444-4444-4444-4444-444444444444', 'Netflix Inc', 'Commercial', 'US2024023', '2024-07-18', '2024-07-19', 'PO-2024-023', 'US753486159', 'MX159486753', 'Netflix Inc, 100 Winchester Circle, Los Gatos, CA 95032, USA', 'US', 'Televisa Univision Inc, 605 Third Avenue, New York, NY 10158, USA', 'MX', 145000.00, 168200.00, 'USD', 'Digital Content Delivery', 18.2500, 'STREAMING', 'NA', 'Approved', 'No', 'vision_per_invoice', 'image', '2024-07-19 16:30:00', '2024-07-19 16:30:00'),

-- 14. Lululemon Athletica
('ab555555-5555-5555-5555-555555555555', 'Lululemon Athletica Inc', 'Commercial', 'CA2024024', '2024-08-05', '2024-08-06', 'PO-2024-024', 'CA357486159', 'US951753486', 'Lululemon Athletica Inc, 1818 Cornwall Avenue, Vancouver, BC V6J 1C7, Canada', 'CA', 'Nike Inc, One Bowerman Drive, Beaverton, OR 97005, USA', 'US', 98000.00, 107800.00, 'CAD', 'Express Courier', 0.7460, 'APPAREL', 'NA', 'Completed', 'No', 'text_per_page', 'text', '2024-08-06 11:45:00', '2024-08-06 11:45:00'),

-- 15. Banco Santander México
('ab666666-6666-6666-6666-666666666666', 'Banco Santander México SA', 'Commercial', 'MX2024025', '2024-08-22', '2024-08-23', 'PO-2024-025', 'MX486159753', 'US753159486', 'Banco Santander México S.A., Av. Prolongación Paseo de la Reforma 500, Ciudad de México, CDMX 06600, Mexico', 'MX', 'JPMorgan Chase & Co, 383 Madison Avenue, New York, NY 10179, USA', 'US', 234000.00, 271560.00, 'MXN', 'Secure Financial Transfer', 18.2500, 'FINANCIAL', 'NA', 'Processed', 'No', 'vision_per_page', 'image', '2024-08-23 14:20:00', '2024-08-23 14:20:00'),

-- 16. Meta Platforms Inc
('ab777777-7777-7777-7777-777777777777', 'Meta Platforms Inc', 'Commercial', 'US2024026', '2024-09-08', '2024-09-09', 'PO-2024-026', 'US159357486', 'CA486951753', 'Meta Platforms Inc, 1 Hacker Way, Menlo Park, CA 94025, USA', 'US', 'Constellation Software Inc, 20 Adelaide Street East, Toronto, ON M5C 2T6, Canada', 'CA', 189000.00, 207900.00, 'USD', 'Priority Tech Delivery', 1.3400, 'SOCIAL-MEDIA', 'NA', 'Approved', 'No', 'text_per_invoice', 'text', '2024-09-09 13:10:00', '2024-09-09 13:10:00'),

-- 17. Bombardier Inc
('ab888888-8888-8888-8888-888888888888', 'Bombardier Inc', 'Commercial', 'CA2024027', '2024-09-25', '2024-09-26', 'PO-2024-027', 'CA951753486', 'MX357486951', 'Bombardier Inc, 400 Côte-Vertu Road West, Dorval, QC H4S 1Y9, Canada', 'CA', 'Grupo Aeroportuario del Sureste SAB de CV, Bosques de Alisos 47A, Bosques de las Lomas, Ciudad de México, CDMX 05120, Mexico', 'MX', 456000.00, 501600.00, 'CAD', 'Air Freight Special', 13.7400, 'AEROSPACE', 'NA', 'Completed', 'No', 'vision_per_page', 'image', '2024-09-26 08:35:00', '2024-09-26 08:35:00'),

-- 18. Starbucks Corporation
('ab999999-9999-9999-9999-999999999999', 'Starbucks Corporation', 'Commercial', 'US2024028', '2024-10-12', '2024-10-13', 'PO-2024-028', 'US486951357', 'CA159753951', 'Starbucks Corporation, 2401 Utah Avenue South, Seattle, WA 98134, USA', 'US', 'Tim Hortons Inc, 874 Sinclair Road, Oakville, ON L6K 2Y1, Canada', 'CA', 67500.00, 74250.00, 'USD', 'Cold Chain Express', 1.3400, 'COFFEE', 'NA', 'Processed', 'No', 'text_per_page', 'text', '2024-10-13 15:25:00', '2024-10-13 15:25:00'),

-- 19. Royal Bank of Canada
('ac111111-1111-1111-1111-111111111111', 'Royal Bank of Canada', 'Commercial', 'CA2024029', '2024-11-01', '2024-11-02', 'PO-2024-029', 'CA753951357', 'US357951753', 'Royal Bank of Canada, 200 Bay Street, Toronto, ON M5J 2J5, Canada', 'CA', 'Bank of America Corporation, 100 North Tryon Street, Charlotte, NC 28255, USA', 'US', 312000.00, 343200.00, 'CAD', 'Secure Banking Transfer', 0.7460, 'BANKING', 'NA', 'Approved', 'No', 'vision_per_invoice', 'image', '2024-11-02 12:50:00', '2024-11-02 12:50:00'),

-- 20. Pemex
('ac222222-2222-2222-2222-222222222222', 'Petróleos Mexicanos', 'Commercial', 'MX2024030', '2024-11-20', '2024-11-21', 'PO-2024-030', 'MX357951486', 'US486357951', 'Petróleos Mexicanos, Av. Marina Nacional 329, Ciudad de México, CDMX 11311, Mexico', 'MX', 'Chevron Corporation, 6001 Bollinger Canyon Road, San Ramon, CA 94583, USA', 'US', 678000.00, 786840.00, 'MXN', 'Pipeline & Tanker', 18.2500, 'PETROLEUM', 'NA', 'Completed', 'No', 'text_per_invoice', 'text', '2024-11-21 10:40:00', '2024-11-21 10:40:00');

-- Line Items for NA Region Invoices - 40 Records (2 per invoice)
INSERT INTO invoice_line_items (
    id, invoice_header_id, item_code, description, quantity, unit_of_measure,
    unit_price, price_per, amount_gross_per_line, amount_net_per_line,
    tax_amount_per_line, tax_rate, line_number, delivery_note, material_number,
    customer_po, currency_per_line, is_additional_charge, created_at, updated_at
) VALUES 
-- Line items for Apple invoice (2 items)
('a1111111-1111-1111-1111-11111111111a', 'a1111111-1111-1111-1111-111111111111', 'IPHONE-15-PRO', 'iPhone 15 Pro 256GB Space Black', 75.00, 'UNIT', 1200.00, 1.00, 99000.00, 90000.00, 9000.00, 10.00, '001', 'Express Shipping', 'MAT-IP15-PRO', 'PO-2024-011', 'USD', 0, '2024-01-09 10:15:00', '2024-01-09 10:15:00'),
('a1111111-1111-1111-1111-11111111111b', 'a1111111-1111-1111-1111-111111111111', 'MACBOOK-AIR-M3', 'MacBook Air 13" M3 Chip 512GB', 25.00, 'UNIT', 1400.00, 1.00, 38500.00, 35000.00, 3500.00, 10.00, '002', 'Express Shipping', 'MAT-MBA-M3', 'PO-2024-011', 'USD', 0, '2024-01-09 10:15:00', '2024-01-09 10:15:00'),

-- Line items for Shopify invoice (2 items)
('a2222222-2222-2222-2222-22222222222a', 'a2222222-2222-2222-2222-222222222222', 'SHOPIFY-PLUS', 'Shopify Plus Enterprise License', 50.00, 'LICENSE', 1200.00, 1.00, 66000.00, 60000.00, 6000.00, 10.00, '001', 'Digital License', 'MAT-SP-PLUS', 'PO-2024-012', 'CAD', 0, '2024-01-23 14:30:00', '2024-01-23 14:30:00'),
('a2222222-2222-2222-2222-22222222222b', 'a2222222-2222-2222-2222-222222222222', 'SHOPIFY-POS', 'Shopify POS Pro Subscription', 50.00, 'SUBSCRIPTION', 500.00, 1.00, 27500.00, 25000.00, 2500.00, 10.00, '002', 'Digital License', 'MAT-SP-POS', 'PO-2024-012', 'CAD', 0, '2024-01-23 14:30:00', '2024-01-23 14:30:00'),

-- Line items for Grupo Bimbo invoice (2 items)
('a3333333-3333-3333-3333-33333333333a', 'a3333333-3333-3333-3333-333333333333', 'BREAD-WHITE', 'White Sandwich Bread Loaf', 1500.00, 'LOAF', 32.00, 1.00, 55680.00, 48000.00, 7680.00, 16.00, '001', 'Refrigerated Truck', 'MAT-BREAD-W', 'PO-2024-013', 'MXN', 0, '2024-02-06 09:45:00', '2024-02-06 09:45:00'),
('a3333333-3333-3333-3333-33333333333b', 'a3333333-3333-3333-3333-333333333333', 'CROISSANT-BTR', 'Butter Croissant 6-Pack', 650.00, 'PACK', 30.00, 1.00, 22620.00, 19500.00, 3120.00, 16.00, '002', 'Refrigerated Truck', 'MAT-CROIS-B', 'PO-2024-013', 'MXN', 0, '2024-02-06 09:45:00', '2024-02-06 09:45:00'),

-- Line items for Amazon invoice (2 items)
('a4444444-4444-4444-4444-44444444444a', 'a4444444-4444-4444-4444-444444444444', 'AWS-EC2-INST', 'AWS EC2 Instance Hours', 5000.00, 'HOUR', 3.50, 1.00, 19250.00, 17500.00, 1750.00, 10.00, '001', 'Cloud Service', 'MAT-AWS-EC2', 'PO-2024-014', 'USD', 0, '2024-02-19 16:20:00', '2024-02-19 16:20:00'),
('a4444444-4444-4444-4444-44444444444b', 'a4444444-4444-4444-4444-444444444444', 'AWS-S3-STOR', 'AWS S3 Storage TB-Month', 12000.00, 'TB-MONTH', 18.00, 1.00, 238140.00, 216500.00, 21640.00, 10.00, '002', 'Cloud Service', 'MAT-AWS-S3', 'PO-2024-014', 'USD', 0, '2024-02-19 16:20:00', '2024-02-19 16:20:00'),

-- Line items for BlackBerry invoice (2 items)
('a5555555-5555-5555-5555-55555555555a', 'a5555555-5555-5555-5555-555555555555', 'BB-CYLANCE', 'BlackBerry Cylance AI Security', 200.00, 'LICENSE', 550.00, 1.00, 121000.00, 110000.00, 11000.00, 10.00, '001', 'Digital License', 'MAT-BB-CYL', 'PO-2024-015', 'CAD', 0, '2024-03-03 11:10:00', '2024-03-03 11:10:00'),
('a5555555-5555-5555-5555-55555555555b', 'a5555555-5555-5555-5555-555555555555', 'BB-SPARK', 'BlackBerry Spark Secure Comms', 100.00, 'LICENSE', 460.00, 1.00, 50600.00, 46000.00, 4600.00, 10.00, '002', 'Digital License', 'MAT-BB-SPK', 'PO-2024-015', 'CAD', 0, '2024-03-03 11:10:00', '2024-03-03 11:10:00'),

-- Line items for Grupo Televisa invoice (2 items)
('a6666666-6666-6666-6666-66666666666a', 'a6666666-6666-6666-6666-666666666666', 'TV-CONTENT-PKG', 'Premium TV Content Package', 12.00, 'PACKAGE', 12000.00, 1.00, 162240.00, 144000.00, 18240.00, 12.67, '001', 'Satellite Transmission', 'MAT-TV-CONT', 'PO-2024-016', 'MXN', 0, '2024-03-16 13:25:00', '2024-03-16 13:25:00'),
('a6666666-6666-6666-6666-66666666666b', 'a6666666-6666-6666-6666-666666666666', 'SPORT-RIGHTS', 'Sports Broadcasting Rights', 6.00, 'LICENSE', 9000.00, 1.00, 67440.00, 54000.00, 13440.00, 24.89, '002', 'Digital Rights', 'MAT-SPORT-R', 'PO-2024-016', 'MXN', 0, '2024-03-16 13:25:00', '2024-03-16 13:25:00'),

-- Line items for Intel invoice (2 items)
('a7777777-7777-7777-7777-77777777777a', 'a7777777-7777-7777-7777-777777777777', 'CORE-I9-14900K', 'Intel Core i9-14900K Processor', 150.00, 'UNIT', 420.00, 1.00, 69300.00, 63000.00, 6300.00, 10.00, '001', 'Tech Express', 'MAT-I9-14900K', 'PO-2024-017', 'USD', 0, '2024-04-02 08:40:00', '2024-04-02 08:40:00'),
('a7777777-7777-7777-7777-77777777777b', 'a7777777-7777-7777-7777-777777777777', 'XEON-GOLD', 'Intel Xeon Gold Server Processor', 65.00, 'UNIT', 520.00, 1.00, 37180.00, 33800.00, 3380.00, 10.00, '002', 'Tech Express', 'MAT-XEON-G', 'PO-2024-017', 'USD', 0, '2024-04-02 08:40:00', '2024-04-02 08:40:00'),

-- Line items for Canadian National Railway invoice (2 items)
('a8888888-8888-8888-8888-88888888888a', 'a8888888-8888-8888-8888-888888888888', 'RAILCAR-GRAIN', 'Grain Hopper Railcar', 25.00, 'RAILCAR', 9500.00, 1.00, 261250.00, 237500.00, 23750.00, 10.00, '001', 'Rail Transport', 'MAT-RC-GRAIN', 'PO-2024-018', 'CAD', 0, '2024-04-21 15:55:00', '2024-04-21 15:55:00'),
('a8888888-8888-8888-8888-88888888888b', 'a8888888-8888-8888-8888-888888888888', 'LOCOMOTIVE-PART', 'Locomotive Engine Parts Kit', 15.00, 'KIT', 7500.00, 1.00, 123750.00, 112500.00, 11250.00, 10.00, '002', 'Rail Transport', 'MAT-LOCO-PRT', 'PO-2024-018', 'CAD', 0, '2024-04-21 15:55:00', '2024-04-21 15:55:00'),

-- Line items for Coca-Cola FEMSA invoice (2 items)
('a9999999-9999-9999-9999-99999999999a', 'a9999999-9999-9999-9999-999999999999', 'COKE-500ML', 'Coca-Cola 500ml Bottle', 2500.00, 'BOTTLE', 48.00, 1.00, 139680.00, 120000.00, 19680.00, 16.40, '001', 'Refrigerated Truck', 'MAT-COKE-500', 'PO-2024-019', 'MXN', 0, '2024-05-06 12:30:00', '2024-05-06 12:30:00'),
('a9999999-9999-9999-9999-99999999999b', 'a9999999-9999-9999-9999-999999999999', 'SPRITE-355ML', 'Sprite 355ml Can 24-Pack', 325.00, 'PACK', 144.62, 1.00, 54560.00, 47000.00, 7560.00, 16.09, '002', 'Refrigerated Truck', 'MAT-SPRITE-355', 'PO-2024-019', 'MXN', 0, '2024-05-06 12:30:00', '2024-05-06 12:30:00'),

-- Line items for Tesla invoice (2 items)
('ab111111-1111-1111-1111-11111111111a', 'ab111111-1111-1111-1111-111111111111', 'MODEL-S-BATTERY', 'Tesla Model S Battery Pack', 15.00, 'UNIT', 28000.00, 1.00, 462000.00, 420000.00, 42000.00, 10.00, '001', 'Specialized Transport', 'MAT-MS-BATT', 'PO-2024-020', 'USD', 0, '2024-05-26 14:45:00', '2024-05-26 14:45:00'),
('ab111111-1111-1111-1111-11111111111b', 'ab111111-1111-1111-1111-111111111111', 'SUPERCHARGER-V4', 'Tesla Supercharger V4 Unit', 7.00, 'UNIT', 21000.00, 1.00, 161700.00, 147000.00, 14700.00, 10.00, '002', 'Specialized Transport', 'MAT-SC-V4', 'PO-2024-020', 'USD', 0, '2024-05-26 14:45:00', '2024-05-26 14:45:00'),

-- Line items for Alimentation Couche-Tard invoice (2 items)
('ab222222-2222-2222-2222-22222222222a', 'ab222222-2222-2222-2222-222222222222', 'CONVENIENCE-MIX', 'Convenience Store Product Mix', 75.00, 'PALLET', 750.00, 1.00, 61875.00, 56250.00, 5625.00, 10.00, '001', 'Refrigerated Delivery', 'MAT-CONV-MIX', 'PO-2024-021', 'CAD', 0, '2024-06-11 10:20:00', '2024-06-11 10:20:00'),
('ab222222-2222-2222-2222-22222222222b', 'ab222222-2222-2222-2222-222222222222', 'FUEL-ADDITIVE', 'Premium Fuel Additive Package', 45.00, 'PACKAGE', 555.56, 1.00, 27500.00, 25000.00, 2500.00, 10.00, '002', 'Standard Delivery', 'MAT-FUEL-ADD', 'PO-2024-021', 'CAD', 0, '2024-06-11 10:20:00', '2024-06-11 10:20:00'),

-- Line items for Grupo Carso invoice (2 items)
('ab333333-3333-3333-3333-33333333333a', 'ab333333-3333-3333-3333-333333333333', 'STEEL-BEAM-H', 'Heavy Steel I-Beam Structure', 180.00, 'BEAM', 1200.00, 1.00, 251280.00, 216000.00, 35280.00, 16.33, '001', 'Heavy Haul Transport', 'MAT-STEEL-H', 'PO-2024-022', 'MXN', 0, '2024-07-03 09:15:00', '2024-07-03 09:15:00'),
('ab333333-3333-3333-3333-33333333333b', 'ab333333-3333-3333-3333-333333333333', 'CONCRETE-MIX', 'High-Grade Concrete Mix', 365.00, 'CUBIC_METER', 200.00, 1.00, 84960.00, 73000.00, 11960.00, 16.38, '002', 'Concrete Truck', 'MAT-CONC-MIX', 'PO-2024-022', 'MXN', 0, '2024-07-03 09:15:00', '2024-07-03 09:15:00'),

-- Line items for Netflix invoice (2 items)
('ab444444-4444-4444-4444-44444444444a', 'ab444444-4444-4444-4444-444444444444', 'ORIG-SERIES-LIC', 'Original Series Content License', 8.00, 'LICENSE', 12500.00, 1.00, 110000.00, 100000.00, 10000.00, 10.00, '001', 'Digital Content', 'MAT-ORIG-SER', 'PO-2024-023', 'USD', 0, '2024-07-19 16:30:00', '2024-07-19 16:30:00'),
('ab444444-4444-4444-4444-44444444444b', 'ab444444-4444-4444-4444-444444444444', 'MOVIE-RIGHTS', 'Exclusive Movie Distribution Rights', 6.00, 'LICENSE', 7500.00, 1.00, 49500.00, 45000.00, 4500.00, 10.00, '002', 'Digital Rights', 'MAT-MOVIE-R', 'PO-2024-023', 'USD', 0, '2024-07-19 16:30:00', '2024-07-19 16:30:00'),

-- Line items for Lululemon invoice (2 items)
('ab555555-5555-5555-5555-55555555555a', 'ab555555-5555-5555-5555-555555555555', 'YOGA-PANT-ALIGN', 'Align High-Rise Yoga Pants', 350.00, 'UNIT', 198.00, 1.00, 76230.00, 69300.00, 6930.00, 10.00, '001', 'Express Fashion', 'MAT-YOGA-ALIGN', 'PO-2024-024', 'CAD', 0, '2024-08-06 11:45:00', '2024-08-06 11:45:00'),
('ab555555-5555-5555-5555-55555555555b', 'ab555555-5555-5555-5555-555555555555', 'SPORTS-BRA-FLOW', 'Flow Y Sports Bra Collection', 185.00, 'UNIT', 118.00, 1.00, 24013.00, 21830.00, 2183.00, 10.00, '002', 'Express Fashion', 'MAT-BRA-FLOW', 'PO-2024-024', 'CAD', 0, '2024-08-06 11:45:00', '2024-08-06 11:45:00'),

-- Line items for Banco Santander México invoice (2 items)
('ab666666-6666-6666-6666-66666666666a', 'ab666666-6666-6666-6666-666666666666', 'BANKING-SOFTWARE', 'Core Banking Software License', 1.00, 'LICENSE', 180000.00, 1.00, 208800.00, 180000.00, 28800.00, 16.00, '001', 'Secure Digital', 'MAT-BANK-SW', 'PO-2024-025', 'MXN', 0, '2024-08-23 14:20:00', '2024-08-23 14:20:00'),
('ab666666-6666-6666-6666-66666666666b', 'ab666666-6666-6666-6666-666666666666', 'SECURITY-MODULE', 'Hardware Security Module', 3.00, 'UNIT', 18000.00, 1.00, 62640.00, 54000.00, 8640.00, 16.00, '002', 'Secure Transport', 'MAT-SEC-MOD', 'PO-2024-025', 'MXN', 0, '2024-08-23 14:20:00', '2024-08-23 14:20:00'),

-- Line items for Meta invoice (2 items)
('ab777777-7777-7777-7777-77777777777a', 'ab777777-7777-7777-7777-777777777777', 'META-QUEST-PRO', 'Meta Quest Pro VR Headset', 125.00, 'UNIT', 1000.00, 1.00, 137500.00, 125000.00, 12500.00, 10.00, '001', 'Tech Express', 'MAT-QUEST-PRO', 'PO-2024-026', 'USD', 0, '2024-09-09 13:10:00', '2024-09-09 13:10:00'),
('ab777777-7777-7777-7777-77777777777b', 'ab777777-7777-7777-7777-777777777777', 'PORTAL-PLUS', 'Meta Portal Plus Video Device', 80.00, 'UNIT', 800.00, 1.00, 70400.00, 64000.00, 6400.00, 10.00, '002', 'Tech Express', 'MAT-PORTAL-PLUS', 'PO-2024-026', 'USD', 0, '2024-09-09 13:10:00', '2024-09-09 13:10:00'),

-- Line items for Bombardier invoice (2 items)
('ab888888-8888-8888-8888-88888888888a', 'ab888888-8888-8888-8888-888888888888', 'AIRCRAFT-ENGINE', 'Regional Aircraft Engine', 4.00, 'UNIT', 85000.00, 1.00, 374000.00, 340000.00, 34000.00, 10.00, '001', 'Air Freight Special', 'MAT-AIRCRAFT-ENG', 'PO-2024-027', 'CAD', 0, '2024-09-26 08:35:00', '2024-09-26 08:35:00'),
('ab888888-8888-8888-8888-88888888888b', 'ab888888-8888-8888-8888-888888888888', 'TRAIN-BOGIE', 'High-Speed Train Bogie Assembly', 8.00, 'UNIT', 14500.00, 1.00, 127600.00, 116000.00, 11600.00, 10.00, '002', 'Rail Transport', 'MAT-TRAIN-BOGIE', 'PO-2024-027', 'CAD', 0, '2024-09-26 08:35:00', '2024-09-26 08:35:00'),

-- Line items for Starbucks invoice (2 items)
('ab999999-9999-9999-9999-99999999999a', 'ab999999-9999-9999-9999-999999999999', 'COFFEE-BEANS-AA', 'Arabica Coffee Beans Grade AA', 1250.00, 'POUND', 35.00, 1.00, 48125.00, 43750.00, 4375.00, 10.00, '001', 'Temperature Controlled', 'MAT-COFFEE-AA', 'PO-2024-028', 'USD', 0, '2024-10-13 15:25:00', '2024-10-13 15:25:00'),
('ab999999-9999-9999-9999-99999999999b', 'ab999999-9999-9999-9999-999999999999', 'ESPRESSO-MACHINE', 'Commercial Espresso Machine', 18.00, 'UNIT', 1250.00, 1.00, 24750.00, 22500.00, 2250.00, 10.00, '002', 'Standard Delivery', 'MAT-ESP-MACH', 'PO-2024-028', 'USD', 0, '2024-10-13 15:25:00', '2024-10-13 15:25:00'),

-- Line items for Royal Bank of Canada invoice (2 items)
('ac111111-1111-1111-1111-11111111111a', 'ac111111-1111-1111-1111-111111111111', 'FINTECH-PLATFORM', 'Digital Banking Platform License', 1.00, 'LICENSE', 220000.00, 1.00, 242000.00, 220000.00, 22000.00, 10.00, '001', 'Secure Digital', 'MAT-FINTECH-PLT', 'PO-2024-029', 'CAD', 0, '2024-11-02 12:50:00', '2024-11-02 12:50:00'),
('ac111111-1111-1111-1111-11111111111b', 'ac111111-1111-1111-1111-111111111111', 'COMPLIANCE-SW', 'Regulatory Compliance Software', 1.00, 'LICENSE', 92000.00, 1.00, 101200.00, 92000.00, 9200.00, 10.00, '002', 'Secure Digital', 'MAT-COMP-SW', 'PO-2024-029', 'CAD', 0, '2024-11-02 12:50:00', '2024-11-02 12:50:00'),

-- Line items for Pemex invoice (2 items)
('ac222222-2222-2222-2222-22222222222a', 'ac222222-2222-2222-2222-222222222222', 'CRUDE-HEAVY', 'Heavy Crude Oil Barrel', 4500.00, 'BARREL', 115.00, 1.00, 603750.00, 517500.00, 86250.00, 16.67, '001', 'Pipeline Transport', 'MAT-CRUDE-HEAVY', 'PO-2024-030', 'MXN', 0, '2024-11-21 10:40:00', '2024-11-21 10:40:00'),
('ac222222-2222-2222-2222-22222222222b', 'ac222222-2222-2222-2222-222222222222', 'REFINING-CATALYST', 'Premium Refining Catalyst', 800.00, 'KILOGRAM', 200.00, 1.00, 185600.00, 160000.00, 25600.00, 16.00, '002', 'Hazmat Transport', 'MAT-REF-CAT', 'PO-2024-030', 'MXN', 0, '2024-11-21 10:40:00', '2024-11-21 10:40:00');

-- Additional Invoice Headers for NA Region - 40 Records (Jan-Jun 2024)
INSERT INTO invoice_headers (
    id, supplier_name, invoice_type, invoice_number, issue_date, invoice_receipt_date,
    po_number, supplier_tax_id, buyer_tax_id, supplier_details, supplier_country_code,
    buyer_details, buyer_country_code, subtotal, total, currency, delivery_note,
    exchange_rate, system_routing, region, status, feedback, extraction_method, 
    processing_method, created_at, updated_at
) VALUES 
-- 21. Adobe Inc
('b1111111-1111-1111-1111-111111111111', 'Adobe Inc', 'Commercial', 'US2024031', '2024-01-03', '2024-01-04', 'PO-2024-031', 'US555888999', 'CA222555888', 'Adobe Inc, 345 Park Avenue, San Jose, CA 95110, USA', 'US', 'Corel Corporation, 1600 Carling Avenue, Ottawa, ON K1Z 8R7, Canada', 'CA', 89000.00, 97900.00, 'USD', 'Digital Download', 1.3400, 'SOFTWARE', 'NA', 'Processed', 'No', 'text_per_invoice', 'text', '2024-01-04 09:20:00', '2024-01-04 09:20:00'),

-- 22. Walmart de México
('b2222222-2222-2222-2222-222222222222', 'Walmart de México SAB de CV', 'Commercial', 'MX2024032', '2024-01-12', '2024-01-13', 'PO-2024-032', 'MX777999111', 'US333666999', 'Walmart de México S.A.B. de C.V., Nextengo 78, Ciudad de México, CDMX 05340, Mexico', 'MX', 'Target Corporation, 1000 Nicollet Mall, Minneapolis, MN 55403, USA', 'US', 156000.00, 181440.00, 'MXN', 'Cross-Border Truck', 18.2500, 'RETAIL', 'NA', 'Failed', 'Yes', 'vision_per_page', 'image', '2024-01-13 11:30:00', '2024-01-13 11:30:00'),

-- 23. Constellation Software
('b3333333-3333-3333-3333-333333333333', 'Constellation Software Inc', 'Commercial', 'CA2024033', '2024-01-18', '2024-01-19', 'PO-2024-033', 'CA888111444', 'MX777444111', 'Constellation Software Inc, 20 Adelaide Street East, Toronto, ON M5C 2T6, Canada', 'CA', 'Softtek LLC, Av. Frontera 205, Monterrey, NL 64720, Mexico', 'MX', 234000.00, 257400.00, 'CAD', 'Software Deployment', 13.7400, 'TECH-SERVICES', 'NA', 'Approved', 'No', 'vision_per_invoice', 'image', '2024-01-19 14:15:00', '2024-01-19 14:15:00'),

-- 24. Ford Motor Company
('b4444444-4444-4444-4444-444444444444', 'Ford Motor Company', 'Commercial', 'US2024034', '2024-01-25', '2024-01-26', 'PO-2024-034', 'US111444777', 'CA555222999', 'Ford Motor Company, One American Road, Dearborn, MI 48126, USA', 'US', 'Linamar Corporation, 287 Speedvale Avenue West, Guelph, ON N1H 1C5, Canada', 'CA', 345000.00, 379500.00, 'USD', 'Auto Transport', 1.3400, 'AUTOMOTIVE', 'NA', 'Completed', 'No', 'text_per_page', 'text', '2024-01-26 10:45:00', '2024-01-26 10:45:00'),

-- 25. Grupo Modelo
('b5555555-5555-5555-5555-555555555555', 'Grupo Modelo SAB de CV', 'Commercial', 'MX2024035', '2024-02-02', '2024-02-03', 'PO-2024-035', 'MX444777222', 'US666333777', 'Grupo Modelo S.A.B. de C.V., Javier Barros Sierra 555, Ciudad de México, CDMX 03020, Mexico', 'MX', 'Anheuser-Busch InBev SA/NV, One Busch Place, St. Louis, MO 63118, USA', 'US', 198000.00, 229680.00, 'MXN', 'Refrigerated Transport', 18.2500, 'BEVERAGES', 'NA', 'Processed', 'No', 'text_per_invoice', 'text', '2024-02-03 16:30:00', '2024-02-03 16:30:00'),

-- 26. Salesforce Inc
('b6666666-6666-6666-6666-666666666666', 'Salesforce Inc', 'Commercial', 'US2024036', '2024-02-08', '2024-02-09', 'PO-2024-036', 'US222777555', 'CA888444222', 'Salesforce Inc, Salesforce Tower, 415 Mission Street, San Francisco, CA 94105, USA', 'US', 'CGI Inc, 1130 Sherbrooke Street West, Montreal, QC H3A 2M8, Canada', 'CA', 167000.00, 183700.00, 'USD', 'Cloud Service', 1.3400, 'CRM-SOFTWARE', 'NA', 'Failed', 'Yes', 'vision_per_page', 'image', '2024-02-09 13:20:00', '2024-02-09 13:20:00'),

-- 27. Husky Energy
('b7777777-7777-7777-7777-777777777777', 'Husky Energy Inc', 'Commercial', 'CA2024037', '2024-02-14', '2024-02-15', 'PO-2024-037', 'CA333999666', 'US111888555', 'Husky Energy Inc, 707 8 Avenue SW, Calgary, AB T2P 1H5, Canada', 'CA', 'Marathon Petroleum Corporation, 539 South Main Street, Findlay, OH 45840, USA', 'US', 456000.00, 501600.00, 'CAD', 'Pipeline Transport', 0.7460, 'ENERGY', 'NA', 'Approved', 'No', 'text_per_page', 'text', '2024-02-15 09:10:00', '2024-02-15 09:10:00'),

-- 28. Grupo Aeroportuario del Pacífico
('b8888888-8888-8888-8888-888888888888', 'Grupo Aeroportuario del Pacífico SAB de CV', 'Commercial', 'MX2024038', '2024-02-22', '2024-02-23', 'PO-2024-038', 'MX555222888', 'CA777555333', 'Grupo Aeroportuario del Pacífico S.A.B. de C.V., Av. de las Torres 6624, Guadalajara, JAL 45019, Mexico', 'MX', 'Toronto Pearson International Airport, 6301 Silver Dart Drive, Mississauga, ON L5P 1B2, Canada', 'CA', 289000.00, 335240.00, 'MXN', 'Air Cargo', 0.0728, 'AVIATION', 'NA', 'Completed', 'No', 'vision_per_invoice', 'image', '2024-02-23 11:25:00', '2024-02-23 11:25:00'),

-- 29. Oracle Corporation
('b9999999-9999-9999-9999-999999999999', 'Oracle Corporation', 'Commercial', 'US2024039', '2024-03-01', '2024-03-02', 'PO-2024-039', 'US666111999', 'MX333777666', 'Oracle Corporation, 500 Oracle Parkway, Redwood City, CA 94065, USA', 'US', 'Tata Consultancy Services México, Torre Murano, Ciudad de México, CDMX 11000, Mexico', 'MX', 123000.00, 142680.00, 'USD', 'Enterprise Delivery', 18.2500, 'DATABASE', 'NA', 'Processed', 'No', 'text_per_invoice', 'text', '2024-03-02 15:40:00', '2024-03-02 15:40:00'),

-- 30. Tim Hortons Inc
('ba111111-1111-1111-1111-111111111111', 'Tim Hortons Inc', 'Commercial', 'CA2024040', '2024-03-07', '2024-03-08', 'PO-2024-040', 'CA777444888', 'US999222666', 'Tim Hortons Inc, 874 Sinclair Road, Oakville, ON L6K 2Y1, Canada', 'CA', 'Dunkin Brands Inc, 130 Royall Street, Canton, MA 02021, USA', 'US', 67500.00, 74250.00, 'CAD', 'Food Service Transport', 0.7460, 'QUICK-SERVICE', 'NA', 'Failed', 'Yes', 'vision_per_page', 'image', '2024-03-08 08:15:00', '2024-03-08 08:15:00'),

-- 31. América Móvil
('ba222222-2222-2222-2222-222222222222', 'América Móvil SAB de CV', 'Commercial', 'MX2024041', '2024-03-12', '2024-03-13', 'PO-2024-041', 'MX888555111', 'CA444888111', 'América Móvil S.A.B. de C.V., Lago Zurich 245, Ciudad de México, CDMX 11529, Mexico', 'MX', 'BCE Inc, 1 Carrefour Alexander-Graham-Bell, Verdun, QC H3E 3B3, Canada', 'CA', 234000.00, 271560.00, 'MXN', 'Telecom Equipment', 0.0728, 'TELECOMMUNICATIONS', 'NA', 'Approved', 'No', 'text_per_page', 'text', '2024-03-13 12:50:00', '2024-03-13 12:50:00'),

-- 32. Lockheed Martin
('ba333333-3333-3333-3333-333333333333', 'Lockheed Martin Corporation', 'Commercial', 'US2024042', '2024-03-18', '2024-03-19', 'PO-2024-042', 'US999666333', 'CA222999555', 'Lockheed Martin Corporation, 6801 Rockledge Drive, Bethesda, MD 20817, USA', 'US', 'CAE Inc, 8585 Côte-de-Liesse Road, Saint-Laurent, QC H4T 1G6, Canada', 'CA', 567000.00, 623700.00, 'USD', 'Defense Transport', 1.3400, 'DEFENSE', 'NA', 'Completed', 'No', 'vision_per_invoice', 'image', '2024-03-19 14:30:00', '2024-03-19 14:30:00'),

-- 33. Teck Resources
('ba444444-4444-4444-4444-444444444444', 'Teck Resources Limited', 'Commercial', 'CA2024043', '2024-03-25', '2024-03-26', 'PO-2024-043', 'CA111777444', 'MX555111888', 'Teck Resources Limited, 550 Burrard Street, Vancouver, BC V6C 0B3, Canada', 'CA', 'Grupo México SAB de CV, Campos Elíseos 400, Ciudad de México, CDMX 11560, Mexico', 'MX', 345000.00, 379500.00, 'CAD', 'Bulk Commodity', 13.7400, 'MINING', 'NA', 'Processed', 'No', 'text_per_page', 'text', '2024-03-26 10:20:00', '2024-03-26 10:20:00'),

-- 34. Uber Technologies
('ba555555-5555-5555-5555-555555555555', 'Uber Technologies Inc', 'Commercial', 'US2024044', '2024-04-02', '2024-04-03', 'PO-2024-044', 'US333888222', 'MX666444999', 'Uber Technologies Inc, 1455 Market Street, San Francisco, CA 94103, USA', 'US', 'DiDi Global Inc, Av. Santa Fe 495, Ciudad de México, CDMX 05348, Mexico', 'MX', 145000.00, 168200.00, 'USD', 'Tech Platform', 18.2500, 'MOBILITY', 'NA', 'Failed', 'Yes', 'vision_per_page', 'image', '2024-04-03 16:45:00', '2024-04-03 16:45:00'),

-- 35. Loblaw Companies
('ba666666-6666-6666-6666-666666666666', 'Loblaw Companies Limited', 'Commercial', 'CA2024045', '2024-04-08', '2024-04-09', 'PO-2024-045', 'CA444111777', 'US777333888', 'Loblaw Companies Limited, 1 Presidents Choice Circle, Brampton, ON L6Y 5S5, Canada', 'CA', 'Kroger Co, 1014 Vine Street, Cincinnati, OH 45202, USA', 'US', 198000.00, 217800.00, 'CAD', 'Grocery Distribution', 0.7460, 'GROCERY', 'NA', 'Approved', 'No', 'text_per_invoice', 'text', '2024-04-09 09:35:00', '2024-04-09 09:35:00'),

-- 36. Grupo Financiero Banorte
('ba777777-7777-7777-7777-777777777777', 'Grupo Financiero Banorte SAB de CV', 'Commercial', 'MX2024046', '2024-04-15', '2024-04-16', 'PO-2024-046', 'MX222666999', 'CA555999222', 'Grupo Financiero Banorte S.A.B. de C.V., Av. Revolución 3000, Monterrey, NL 64720, Mexico', 'MX', 'Bank of Montreal, 129 Saint-Jacques Street, Montreal, QC H2Y 1L6, Canada', 'CA', 289000.00, 335240.00, 'MXN', 'Financial Services', 0.0728, 'BANKING', 'NA', 'Completed', 'No', 'text_per_page', 'text', '2024-04-16 13:10:00', '2024-04-16 13:10:00'),

-- 37. Palantir Technologies
('ba888888-8888-8888-8888-888888888888', 'Palantir Technologies Inc', 'Commercial', 'US2024047', '2024-04-22', '2024-04-23', 'PO-2024-047', 'US555333999', 'CA888666111', 'Palantir Technologies Inc, 1555 Blake Street, Denver, CO 80202, USA', 'US', 'OpenText Corporation, 275 Frank Tompa Drive, Waterloo, ON N2L 0A1, Canada', 'CA', 234000.00, 257400.00, 'USD', 'Data Analytics', 1.3400, 'BIG-DATA', 'NA', 'Processed', 'No', 'vision_per_invoice', 'image', '2024-04-23 11:55:00', '2024-04-23 11:55:00'),

-- 38. Shoppers Drug Mart
('ba999999-9999-9999-9999-999999999999', 'Shoppers Drug Mart Corporation', 'Commercial', 'CA2024048', '2024-04-28', '2024-04-29', 'PO-2024-048', 'CA666999444', 'MX111555999', 'Shoppers Drug Mart Corporation, 243 Consumers Road, Toronto, ON M2J 4W8, Canada', 'CA', 'Farmacias del Ahorro SA de CV, Insurgentes Sur 1647, Ciudad de México, CDMX 03020, Mexico', 'MX', 89000.00, 97900.00, 'CAD', 'Pharmaceutical', 13.7400, 'PHARMACY', 'NA', 'Failed', 'Yes', 'text_per_page', 'text', '2024-04-29 14:40:00', '2024-04-29 14:40:00'),

-- 39. Raytheon Technologies
('bb111111-1111-1111-1111-111111111111', 'Raytheon Technologies Corporation', 'Commercial', 'US2024049', '2024-05-05', '2024-05-06', 'PO-2024-049', 'US777222555', 'CA333777444', 'Raytheon Technologies Corporation, 870 Winter Street, Waltham, MA 02451, USA', 'US', 'L3Harris Technologies Canada, 13800 Commerce Parkway, Richmond, BC V6V 2J3, Canada', 'CA', 456000.00, 501600.00, 'USD', 'Defense Systems', 1.3400, 'AEROSPACE-DEFENSE', 'NA', 'Approved', 'No', 'vision_per_invoice', 'image', '2024-05-06 10:25:00', '2024-05-06 10:25:00'),

-- 40. Kimberly-Clark de México
('bb222222-2222-2222-2222-222222222222', 'Kimberly-Clark de México SAB de CV', 'Commercial', 'MX2024050', '2024-05-12', '2024-05-13', 'PO-2024-050', 'MX999444777', 'US444999666', 'Kimberly-Clark de México S.A.B. de C.V., Jaime Balmes 8, Ciudad de México, CDMX 11510, Mexico', 'MX', 'Procter & Gamble Company, One Procter & Gamble Plaza, Cincinnati, OH 45202, USA', 'US', 167000.00, 193720.00, 'MXN', 'Consumer Goods', 18.2500, 'CONSUMER-PRODUCTS', 'NA', 'Completed', 'No', 'text_per_invoice', 'text', '2024-05-13 15:15:00', '2024-05-13 15:15:00'),

-- 41. Zoom Video Communications
('bb333333-3333-3333-3333-333333333333', 'Zoom Video Communications Inc', 'Commercial', 'US2024051', '2024-05-18', '2024-05-19', 'PO-2024-051', 'US111999444', 'CA666222777', 'Zoom Video Communications Inc, 55 Almaden Boulevard, San Jose, CA 95113, USA', 'US', 'Mitel Networks Corporation, 350 Legget Drive, Ottawa, ON K2K 2W7, Canada', 'CA', 123000.00, 135300.00, 'USD', 'Video Conferencing', 1.3400, 'COMMUNICATIONS', 'NA', 'Processed', 'No', 'text_per_page', 'text', '2024-05-19 12:30:00', '2024-05-19 12:30:00'),

-- 42. Canadian Tire Corporation
('bb444444-4444-4444-4444-444444444444', 'Canadian Tire Corporation Limited', 'Commercial', 'CA2024052', '2024-05-25', '2024-05-26', 'PO-2024-052', 'CA888333666', 'MX222777555', 'Canadian Tire Corporation Limited, 2180 Yonge Street, Toronto, ON M4S 2B9, Canada', 'CA', 'Home Depot de México SA de CV, Blvd. Manuel Ávila Camacho 647, Naucalpan, MEX 53910, Mexico', 'MX', 234000.00, 257400.00, 'CAD', 'Retail Merchandise', 13.7400, 'HOME-IMPROVEMENT', 'NA', 'Failed', 'Yes', 'vision_per_page', 'image', '2024-05-26 09:45:00', '2024-05-26 09:45:00'),

-- 43. Spotify Technology
('bb555555-5555-5555-5555-555555555555', 'Spotify Technology SA', 'Commercial', 'US2024053', '2024-06-02', '2024-06-03', 'PO-2024-053', 'US444777888', 'CA999555333', 'Spotify Technology S.A., 4 World Trade Center, New York, NY 10007, USA', 'US', 'Corus Entertainment Inc, Corus Quay, 25 Dockside Drive, Toronto, ON M5A 0B5, Canada', 'CA', 89000.00, 97900.00, 'USD', 'Streaming License', 1.3400, 'MUSIC-STREAMING', 'NA', 'Approved', 'No', 'text_per_invoice', 'text', '2024-06-03 16:20:00', '2024-06-03 16:20:00'),

-- 44. Grupo México
('bb666666-6666-6666-6666-666666666666', 'Grupo México SAB de CV', 'Commercial', 'MX2024054', '2024-06-08', '2024-06-09', 'PO-2024-054', 'MX333888555', 'US777111666', 'Grupo México S.A.B. de C.V., Campos Elíseos 400, Ciudad de México, CDMX 11560, Mexico', 'MX', 'Freeport-McMoRan Inc, 333 North Central Avenue, Phoenix, AZ 85004, USA', 'US', 456000.00, 529440.00, 'MXN', 'Mining Transport', 18.2500, 'COPPER-MINING', 'NA', 'Completed', 'No', 'vision_per_invoice', 'image', '2024-06-09 11:10:00', '2024-06-09 11:10:00'),

-- 45. Slack Technologies
('bb777777-7777-7777-7777-777777777777', 'Slack Technologies LLC', 'Commercial', 'US2024055', '2024-06-15', '2024-06-16', 'PO-2024-055', 'US666444111', 'CA333999777', 'Slack Technologies LLC, 500 Howard Street, San Francisco, CA 94105, USA', 'US', 'Atlassian Corporation, 431 Front Street West, Toronto, ON M5V 3S1, Canada', 'CA', 145000.00, 159500.00, 'USD', 'Collaboration Tools', 1.3400, 'WORKPLACE-TOOLS', 'NA', 'Processed', 'No', 'text_per_page', 'text', '2024-06-16 14:35:00', '2024-06-16 14:35:00'),

-- 46. Dollarama Inc
('bb888888-8888-8888-8888-888888888888', 'Dollarama Inc', 'Commercial', 'CA2024056', '2024-06-22', '2024-06-23', 'PO-2024-056', 'CA222888444', 'MX555333999', 'Dollarama Inc, 5805 Rue Ferrier, Montreal, QC H4P 1M7, Canada', 'CA', 'Dollar General Corporation, 100 Mission Ridge, Goodlettsville, TN 37072, USA', 'MX', 67500.00, 74250.00, 'CAD', 'Discount Retail', 13.7400, 'DISCOUNT-RETAIL', 'NA', 'Failed', 'Yes', 'text_per_page', 'text', '2024-06-23 10:50:00', '2024-06-23 10:50:00'),

-- 47. VMware Inc
('bb999999-9999-9999-9999-999999999999', 'VMware Inc', 'Commercial', 'US2024057', '2024-06-28', '2024-06-29', 'PO-2024-057', 'US999111777', 'CA777444888', 'VMware Inc, 3401 Hillview Avenue, Palo Alto, CA 94304, USA', 'US', 'Nuvei Corporation, 1 Place Ville Marie, Montreal, QC H3B 3N2, Canada', 'CA', 198000.00, 217800.00, 'USD', 'Virtualization', 1.3400, 'VIRTUALIZATION', 'NA', 'Approved', 'No', 'vision_per_invoice', 'image', '2024-06-29 13:40:00', '2024-06-29 13:40:00'),

-- 48. Cemex
('bc111111-1111-1111-1111-111111111111', 'Cemex SAB de CV', 'Commercial', 'MX2024058', '2024-06-30', '2024-06-30', 'PO-2024-058', 'MX777555222', 'CA111888333', 'CEMEX S.A.B. de C.V., Av. Ricardo Margáin Zozaya 325, San Pedro Garza García, NL 66265, Mexico', 'MX', 'Lafarge Canada Inc, 6509 Airport Road, Mississauga, ON L4V 1S7, Canada', 'CA', 345000.00, 400200.00, 'MXN', 'Construction Materials', 0.0728, 'CONSTRUCTION', 'NA', 'Completed', 'No', 'text_per_invoice', 'text', '2024-06-30 17:00:00', '2024-06-30 17:00:00'),

-- 49. Caterpillar Inc
('bc222222-2222-2222-2222-222222222222', 'Caterpillar Inc', 'Commercial', 'US2024059', '2024-06-25', '2024-06-26', 'PO-2024-059', 'US555999333', 'MX888222666', 'Caterpillar Inc, 510 Lake Cook Road, Deerfield, IL 60015, USA', 'US', 'Grupo Industrial Caterpillar SA de CV, Av. de los Jinetes 3000, Tijuana, BC 22435, Mexico', 'MX', 678000.00, 786840.00, 'USD', 'Heavy Machinery', 18.2500, 'HEAVY-EQUIPMENT', 'NA', 'Processed', 'No', 'vision_per_invoice', 'image', '2024-06-26 08:25:00', '2024-06-26 08:25:00'),

-- 50. Enbridge Inc
('bc333333-3333-3333-3333-333333333333', 'Enbridge Inc', 'Commercial', 'CA2024060', '2024-06-20', '2024-06-21', 'PO-2024-060', 'CA444666222', 'US222555999', 'Enbridge Inc, 200 5th Avenue SW, Calgary, AB T2P 2V6, Canada', 'CA', 'Kinder Morgan Inc, 1001 Louisiana Street, Houston, TX 77002, USA', 'US', 567000.00, 623700.00, 'CAD', 'Pipeline Infrastructure', 0.7460, 'PIPELINE', 'NA', 'Failed', 'Yes', 'text_per_page', 'text', '2024-06-21 12:15:00', '2024-06-21 12:15:00');

-- Line Items for Additional NA Region Invoices - 40 Records (1 per invoice)
INSERT INTO invoice_line_items (
    id, invoice_header_id, item_code, description, quantity, unit_of_measure,
    unit_price, price_per, amount_gross_per_line, amount_net_per_line,
    tax_amount_per_line, tax_rate, line_number, delivery_note, material_number,
    customer_po, currency_per_line, is_additional_charge, created_at, updated_at
) VALUES 
-- Line item for Adobe invoice
('b1111111-1111-1111-1111-11111111111a', 'b1111111-1111-1111-1111-111111111111', 'CC-ALL-APPS', 'Creative Cloud All Apps License', 150.00, 'LICENSE', 593.33, 1.00, 97900.00, 89000.00, 8900.00, 10.00, '001', 'Digital License Key', 'MAT-CC-ALL', 'PO-2024-031', 'USD', 0, '2024-01-04 09:20:00', '2024-01-04 09:20:00'),

-- Line item for Walmart de México invoice
('b2222222-2222-2222-2222-22222222222a', 'b2222222-2222-2222-2222-222222222222', 'GROCERY-BULK', 'Bulk Grocery Product Mix', 400.00, 'PALLET', 390.00, 1.00, 181440.00, 156000.00, 25440.00, 16.31, '001', 'Cross-Border Transport', 'MAT-GROC-BULK', 'PO-2024-032', 'MXN', 0, '2024-01-13 11:30:00', '2024-01-13 11:30:00'),

-- Line item for Constellation Software invoice
('b3333333-3333-3333-3333-33333333333a', 'b3333333-3333-3333-3333-333333333333', 'ENTERPRISE-SW', 'Enterprise Software Suite', 1.00, 'LICENSE', 234000.00, 1.00, 257400.00, 234000.00, 23400.00, 10.00, '001', 'Software Implementation', 'MAT-ENT-SW', 'PO-2024-033', 'CAD', 0, '2024-01-19 14:15:00', '2024-01-19 14:15:00'),

-- Line item for Ford Motor Company invoice
('b4444444-4444-4444-4444-44444444444a', 'b4444444-4444-4444-4444-444444444444', 'F150-PARTS-KIT', 'F-150 Truck Parts Assembly Kit', 500.00, 'KIT', 690.00, 1.00, 379500.00, 345000.00, 34500.00, 10.00, '001', 'Automotive Transport', 'MAT-F150-PRT', 'PO-2024-034', 'USD', 0, '2024-01-26 10:45:00', '2024-01-26 10:45:00'),

-- Line item for Grupo Modelo invoice
('b5555555-5555-5555-5555-55555555555a', 'b5555555-5555-5555-5555-555555555555', 'CORONA-24PK', 'Corona Extra 355ml 24-Pack Case', 850.00, 'CASE', 233.00, 1.00, 229680.00, 198000.00, 31680.00, 16.00, '001', 'Refrigerated Beer Transport', 'MAT-CORONA-24', 'PO-2024-035', 'MXN', 0, '2024-02-03 16:30:00', '2024-02-03 16:30:00'),

-- Line item for Salesforce invoice
('b6666666-6666-6666-6666-66666666666a', 'b6666666-6666-6666-6666-666666666666', 'SALES-CLOUD-ENT', 'Sales Cloud Enterprise Edition', 250.00, 'USER_LICENSE', 668.00, 1.00, 183700.00, 167000.00, 16700.00, 10.00, '001', 'Cloud Platform Access', 'MAT-SC-ENT', 'PO-2024-036', 'USD', 0, '2024-02-09 13:20:00', '2024-02-09 13:20:00'),

-- Line item for Husky Energy invoice
('b7777777-7777-7777-7777-77777777777a', 'b7777777-7777-7777-7777-777777777777', 'HEAVY-OIL-BITUMIN', 'Heavy Oil Bitumen Barrel', 6000.00, 'BARREL', 76.00, 1.00, 501600.00, 456000.00, 45600.00, 10.00, '001', 'Pipeline Delivery', 'MAT-HEAVY-OIL', 'PO-2024-037', 'CAD', 0, '2024-02-15 09:10:00', '2024-02-15 09:10:00'),

-- Line item for Grupo Aeroportuario del Pacífico invoice
('b8888888-8888-8888-8888-88888888888a', 'b8888888-8888-8888-8888-888888888888', 'AIRPORT-SERVICE', 'Airport Ground Handling Services', 1450.00, 'SERVICE_HOUR', 199.31, 1.00, 335240.00, 289000.00, 46240.00, 16.00, '001', 'Airport Operations', 'MAT-AIRPORT-SVC', 'PO-2024-038', 'MXN', 0, '2024-02-23 11:25:00', '2024-02-23 11:25:00'),

-- Line item for Oracle invoice
('b9999999-9999-9999-9999-99999999999a', 'b9999999-9999-9999-9999-999999999999', 'ORACLE-DB-ENT', 'Oracle Database Enterprise Edition', 75.00, 'PROCESSOR_LICENSE', 1640.00, 1.00, 142680.00, 123000.00, 19680.00, 16.00, '001', 'Database License', 'MAT-ORA-DB-ENT', 'PO-2024-039', 'USD', 0, '2024-03-02 15:40:00', '2024-03-02 15:40:00'),

-- Line item for Tim Hortons invoice
('ba111111-1111-1111-1111-11111111111a', 'ba111111-1111-1111-1111-111111111111', 'COFFEE-PREMIUM', 'Premium Coffee Blend 5lb Bag', 900.00, 'BAG', 75.00, 1.00, 74250.00, 67500.00, 6750.00, 10.00, '001', 'Food Service Delivery', 'MAT-COFFEE-PREM', 'PO-2024-040', 'CAD', 0, '2024-03-08 08:15:00', '2024-03-08 08:15:00'),

-- Line item for América Móvil invoice
('ba222222-2222-2222-2222-22222222222a', 'ba222222-2222-2222-2222-222222222222', 'TELECOM-INFRA', 'Telecommunications Infrastructure Kit', 850.00, 'KIT', 275.29, 1.00, 271560.00, 234000.00, 37560.00, 16.05, '001', 'Telecom Equipment Transport', 'MAT-TELECOM-INF', 'PO-2024-041', 'MXN', 0, '2024-03-13 12:50:00', '2024-03-13 12:50:00'),

-- Line item for Lockheed Martin invoice
('ba333333-3333-3333-3333-33333333333a', 'ba333333-3333-3333-3333-333333333333', 'MISSILE-SYSTEM', 'Advanced Missile Defense System', 3.00, 'SYSTEM', 189000.00, 1.00, 623700.00, 567000.00, 56700.00, 10.00, '001', 'Defense Secure Transport', 'MAT-MISSILE-SYS', 'PO-2024-042', 'USD', 0, '2024-03-19 14:30:00', '2024-03-19 14:30:00'),

-- Line item for Teck Resources invoice
('ba444444-4444-4444-4444-44444444444a', 'ba444444-4444-4444-4444-444444444444', 'COPPER-CONCENTRATE', 'Copper Concentrate Bulk', 2500.00, 'METRIC_TON', 138.00, 1.00, 379500.00, 345000.00, 34500.00, 10.00, '001', 'Bulk Mining Transport', 'MAT-COPPER-CONC', 'PO-2024-043', 'CAD', 0, '2024-03-26 10:20:00', '2024-03-26 10:20:00'),

-- Line item for Uber Technologies invoice
('ba555555-5555-5555-5555-55555555555a', 'ba555555-5555-5555-5555-555555555555', 'RIDE-TECH-PLATFORM', 'Ride-Sharing Technology Platform', 1.00, 'PLATFORM_LICENSE', 145000.00, 1.00, 168200.00, 145000.00, 23200.00, 16.00, '001', 'Digital Platform', 'MAT-RIDE-TECH', 'PO-2024-044', 'USD', 0, '2024-04-03 16:45:00', '2024-04-03 16:45:00'),

-- Line item for Loblaw Companies invoice
('ba666666-6666-6666-6666-66666666666a', 'ba666666-6666-6666-6666-666666666666', 'PRIVATE-LABEL', 'Private Label Product Collection', 1100.00, 'CASE', 180.00, 1.00, 217800.00, 198000.00, 19800.00, 10.00, '001', 'Grocery Chain Distribution', 'MAT-PRIV-LABEL', 'PO-2024-045', 'CAD', 0, '2024-04-09 09:35:00', '2024-04-09 09:35:00'),

-- Line item for Grupo Financiero Banorte invoice
('ba777777-7777-7777-7777-77777777777a', 'ba777777-7777-7777-7777-777777777777', 'BANKING-TECH-SOL', 'Banking Technology Solution', 1.00, 'SOLUTION', 289000.00, 1.00, 335240.00, 289000.00, 46240.00, 16.00, '001', 'Financial Technology', 'MAT-BANK-TECH', 'PO-2024-046', 'MXN', 0, '2024-04-16 13:10:00', '2024-04-16 13:10:00'),

-- Line item for Palantir Technologies invoice
('ba888888-8888-8888-8888-88888888888a', 'ba888888-8888-8888-8888-888888888888', 'DATA-ANALYTICS', 'Advanced Data Analytics Platform', 1.00, 'PLATFORM', 234000.00, 1.00, 257400.00, 234000.00, 23400.00, 10.00, '001', 'Data Platform Deployment', 'MAT-DATA-ANALY', 'PO-2024-047', 'USD', 0, '2024-04-23 11:55:00', '2024-04-23 11:55:00'),

-- Line item for Shoppers Drug Mart invoice
('ba999999-9999-9999-9999-99999999999a', 'ba999999-9999-9999-9999-999999999999', 'PHARMA-MIX', 'Pharmaceutical Product Mix', 445.00, 'CASE', 200.00, 1.00, 97900.00, 89000.00, 8900.00, 10.00, '001', 'Cold Chain Pharmacy', 'MAT-PHARMA-MIX', 'PO-2024-048', 'CAD', 0, '2024-04-29 14:40:00', '2024-04-29 14:40:00'),

-- Line item for Raytheon Technologies invoice
('bb111111-1111-1111-1111-11111111111a', 'bb111111-1111-1111-1111-111111111111', 'RADAR-SYSTEM', 'Advanced Radar System Module', 8.00, 'MODULE', 57000.00, 1.00, 501600.00, 456000.00, 45600.00, 10.00, '001', 'Defense Aerospace Transport', 'MAT-RADAR-SYS', 'PO-2024-049', 'USD', 0, '2024-05-06 10:25:00', '2024-05-06 10:25:00'),

-- Line item for Kimberly-Clark de México invoice
('bb222222-2222-2222-2222-22222222222a', 'bb222222-2222-2222-2222-222222222222', 'TISSUE-PRODUCTS', 'Tissue and Paper Products Mix', 950.00, 'CASE', 175.79, 1.00, 193720.00, 167000.00, 26720.00, 16.00, '001', 'Consumer Goods Transport', 'MAT-TISSUE-MIX', 'PO-2024-050', 'MXN', 0, '2024-05-13 15:15:00', '2024-05-13 15:15:00'),

-- Line item for Zoom Video Communications invoice
('bb333333-3333-3333-3333-33333333333a', 'bb333333-3333-3333-3333-333333333333', 'ZOOM-ENTERPRISE', 'Zoom Enterprise License Pack', 300.00, 'LICENSE', 410.00, 1.00, 135300.00, 123000.00, 12300.00, 10.00, '001', 'Digital Video Platform', 'MAT-ZOOM-ENT', 'PO-2024-051', 'USD', 0, '2024-05-19 12:30:00', '2024-05-19 12:30:00'),

-- Line item for Canadian Tire Corporation invoice
('bb444444-4444-4444-4444-44444444444a', 'bb444444-4444-4444-4444-444444444444', 'AUTO-PARTS-MIX', 'Automotive Parts Mixed Inventory', 780.00, 'UNIT', 300.00, 1.00, 257400.00, 234000.00, 23400.00, 10.00, '001', 'Retail Distribution', 'MAT-AUTO-MIX', 'PO-2024-052', 'CAD', 0, '2024-05-26 09:45:00', '2024-05-26 09:45:00'),

-- Line item for Spotify Technology invoice
('bb555555-5555-5555-5555-55555555555a', 'bb555555-5555-5555-5555-555555555555', 'MUSIC-STREAMING', 'Music Streaming Platform License', 1.00, 'PLATFORM', 89000.00, 1.00, 97900.00, 89000.00, 8900.00, 10.00, '001', 'Digital Music Platform', 'MAT-MUSIC-STREAM', 'PO-2024-053', 'USD', 0, '2024-06-03 16:20:00', '2024-06-03 16:20:00'),

-- Line item for Grupo México invoice
('bb666666-6666-6666-6666-66666666666a', 'bb666666-6666-6666-6666-666666666666', 'COPPER-ORE', 'Raw Copper Ore Bulk Shipment', 3800.00, 'METRIC_TON', 120.00, 1.00, 529440.00, 456000.00, 73440.00, 16.11, '001', 'Mining Bulk Transport', 'MAT-COPPER-ORE', 'PO-2024-054', 'MXN', 0, '2024-06-09 11:10:00', '2024-06-09 11:10:00'),

-- Line item for Slack Technologies invoice
('bb777777-7777-7777-7777-77777777777a', 'bb777777-7777-7777-7777-777777777777', 'SLACK-ENTERPRISE', 'Slack Enterprise Grid License', 500.00, 'USER_LICENSE', 290.00, 1.00, 159500.00, 145000.00, 14500.00, 10.00, '001', 'Enterprise Communication', 'MAT-SLACK-ENT', 'PO-2024-055', 'USD', 0, '2024-06-16 14:35:00', '2024-06-16 14:35:00'),

-- Line item for Dollarama invoice
('bb888888-8888-8888-8888-88888888888a', 'bb888888-8888-8888-8888-888888888888', 'DISCOUNT-GOODS', 'Discount Retail Goods Mix', 675.00, 'CASE', 100.00, 1.00, 74250.00, 67500.00, 6750.00, 10.00, '001', 'Discount Retail Distribution', 'MAT-DISC-GOODS', 'PO-2024-056', 'CAD', 0, '2024-06-23 10:50:00', '2024-06-23 10:50:00'),

-- Line item for VMware invoice
('bb999999-9999-9999-9999-99999999999a', 'bb999999-9999-9999-9999-999999999999', 'VSPHERE-ENT', 'vSphere Enterprise Plus License', 100.00, 'CPU_LICENSE', 1980.00, 1.00, 217800.00, 198000.00, 19800.00, 10.00, '001', 'Virtualization Platform', 'MAT-VSPHERE-ENT', 'PO-2024-057', 'USD', 0, '2024-06-29 13:40:00', '2024-06-29 13:40:00'),

-- Line item for Cemex invoice
('bc111111-1111-1111-1111-11111111111a', 'bc111111-1111-1111-1111-111111111111', 'READY-MIX-CONCRETE', 'Ready-Mix Concrete Bulk', 2300.00, 'CUBIC_METER', 150.00, 1.00, 400200.00, 345000.00, 55200.00, 16.00, '001', 'Concrete Mixer Truck', 'MAT-READY-MIX', 'PO-2024-058', 'MXN', 0, '2024-06-30 17:00:00', '2024-06-30 17:00:00'),

-- Line item for Caterpillar invoice
('bc222222-2222-2222-2222-22222222222a', 'bc222222-2222-2222-2222-222222222222', 'CAT-EXCAVATOR', 'Caterpillar 320 Excavator', 6.00, 'UNIT', 113000.00, 1.00, 786840.00, 678000.00, 108840.00, 16.06, '001', 'Heavy Equipment Transport', 'MAT-CAT-EXCAV', 'PO-2024-059', 'USD', 0, '2024-06-26 08:25:00', '2024-06-26 08:25:00'),

-- Line item for Enbridge invoice
('bc333333-3333-3333-3333-33333333333a', 'bc333333-3333-3333-3333-333333333333', 'PIPELINE-EQUIPMENT', 'Natural Gas Pipeline Equipment', 45.00, 'UNIT', 12600.00, 1.00, 623700.00, 567000.00, 56700.00, 10.00, '001', 'Pipeline Infrastructure', 'MAT-PIPELINE-EQ', 'PO-2024-060', 'CAD', 0, '2024-06-21 12:15:00', '2024-06-21 12:15:00');
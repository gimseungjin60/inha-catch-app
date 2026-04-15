-- Test Data Insert
INSERT INTO user (email, password, nickname, major, grade, keywords, is_active, created_at) 
VALUES 
('test@example.com', '1234', 'Test User', 'Computer Science', '1', 'scholarship,scholarship', 1, NOW());

INSERT INTO user (email, password, nickname, major, grade, keywords, is_active, created_at) 
VALUES 
('admin@example.com', 'admin123', 'Admin', 'Engineering', '2', 'competition,awards', 1, NOW());

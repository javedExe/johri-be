-- password = "superpass" hashed with bcrypt(10)
INSERT INTO users (username, email, password_hash, role_id)
VALUES ('super', '[email protected]',
        '$2b$10$wZCqSg..l1rHSzTKnSovi.5F2GXNKAfo0Bq1hTGqYDzN6T6uWuXFO', 1)
ON CONFLICT (username) DO NOTHING;

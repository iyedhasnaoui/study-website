INSERT INTO users (id, username, email, password_hash) -- add dummy user to debug ForumPostController, else is it a foreign key constraint violation error --
VALUES (1, 'testuser', 'test@example.com', 'password_hash')
ON CONFLICT (id) DO NOTHING;
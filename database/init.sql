-- Runs automatically when the MySQL container first starts
-- (mounted into /docker-entrypoint-initdb.d/)

CREATE DATABASE IF NOT EXISTS todo_db;
USE todo_db;

CREATE TABLE IF NOT EXISTS tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200)  NOT NULL,
  description VARCHAR(500)  DEFAULT '',
  status      ENUM('pending', 'in_progress', 'done') DEFAULT 'pending',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed data so there's something to see right away
INSERT INTO tasks (title, description, status) VALUES
  ('Learn Docker basics',      'Images, containers, Dockerfile',         'done'),
  ('Write a Dockerfile',       'Build custom Node.js image',              'done'),
  ('Set up Docker Compose',    'API + MySQL multi-container stack',       'in_progress'),
  ('Push image to ECR',        'Tag and push to AWS private registry',    'pending'),
  ('Deploy to Docker Swarm',   '3-node cluster on EC2',                   'pending'),
  ('Demonstrate load balancing','Hit all 3 node IPs, see hostnames rotate','pending');

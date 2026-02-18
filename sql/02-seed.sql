-- =============================================
-- I LOVE FDL — Seed Data
-- Paste this into Neon SQL Editor SECOND
-- =============================================

-- Password hash for "password123" (bcrypt, 12 rounds)
-- Pre-computed so we don't need bcrypt in SQL

-- Admin user
INSERT INTO "users" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt")
VALUES ('admin001', 'admin@ilovefdl.com', '$2a$12$LJ3m4ys3uz0HjCWbF0GnKuIZPnMVYIBKeyCAMFwey8j9GHhMdqxbC', 'Admin', 'ADMIN', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = NOW();

-- Editor user
INSERT INTO "users" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt")
VALUES ('editor001', 'editor@ilovefdl.com', '$2a$12$LJ3m4ys3uz0HjCWbF0GnKuIZPnMVYIBKeyCAMFwey8j9GHhMdqxbC', 'Editor', 'EDITOR', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = NOW();

-- Vendor user
INSERT INTO "users" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt")
VALUES ('vendor001', 'vendor@ilovefdl.com', '$2a$12$LJ3m4ys3uz0HjCWbF0GnKuIZPnMVYIBKeyCAMFwey8j9GHhMdqxbC', 'Sample Vendor', 'VENDOR', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = NOW();

-- Vendor business
INSERT INTO "vendors" ("id", "userId", "businessName", "slug", "description", "status", "address", "commissionRate", "stripeOnboarded", "createdAt", "updatedAt")
VALUES ('vendorbiz001', 'vendor001', 'Fond du Lac Gifts', 'fond-du-lac-gifts', 'Unique gifts and souvenirs celebrating Fond du Lac and Lake Winnebago.', 'APPROVED', '123 Main St, Fond du Lac, WI 54935', 0.05, false, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- Products
INSERT INTO "products" ("id", "vendorId", "name", "slug", "description", "price", "images", "categoryTags", "inventory", "isActive", "externalPlatform", "createdAt", "updatedAt")
VALUES
  ('prod001', 'vendorbiz001', 'Lake Winnebago Candle', 'lake-winnebago-candle', 'Hand-poured soy candle inspired by the shores of Lake Winnebago. Notes of pine, fresh water, and wildflowers.', 24.99, '{}', '{"gifts","home"}', 50, true, 'NATIVE', NOW(), NOW()),
  ('prod002', 'vendorbiz001', 'FDL Lighthouse Print', 'fdl-lighthouse-print', 'Beautiful watercolor print of the iconic Fond du Lac lighthouse. 8x10 on archival paper.', 35.00, '{}', '{"art","prints"}', 25, true, 'NATIVE', NOW(), NOW()),
  ('prod003', 'vendorbiz001', 'I Love FDL T-Shirt', 'i-love-fdl-tshirt', 'Show your Fond du Lac pride with this comfortable cotton tee. Available in S-XXL.', 22.00, '{}', '{"apparel","shirts"}', 100, true, 'NATIVE', NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- Bars
INSERT INTO "bars" ("id", "name", "slug", "description", "address", "phone", "photos", "isActive", "createdAt", "updatedAt")
VALUES
  ('bar001', 'Schmitty''s Bar & Grill', 'schmittys-bar-and-grill', 'A Fond du Lac favorite serving cold drinks and great food since 1985.', '456 Main St, Fond du Lac, WI 54935', '(920) 555-0101', '{}', true, NOW(), NOW()),
  ('bar002', 'Lakeside Tavern', 'lakeside-tavern', 'Waterfront bar with stunning Lake Winnebago views and the best fish fry in town.', '789 Lakeshore Dr, Fond du Lac, WI 54935', '(920) 555-0102', '{}', true, NOW(), NOW()),
  ('bar003', 'The Retro', 'the-retro', 'Downtown cocktail lounge with craft cocktails and live music on weekends.', '321 S Main St, Fond du Lac, WI 54935', '(920) 555-0103', '{}', true, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- Specials
INSERT INTO "specials" ("id", "barId", "dayOfWeek", "title", "description", "price", "startTime", "endTime", "isFeatured", "isActive", "createdAt", "updatedAt")
VALUES
  ('spec001', 'bar001', 'MONDAY', 'Monday Madness Wings', '50-cent wings all day. Dine-in only.', '$0.50/wing', '11:00', '22:00', false, true, NOW(), NOW()),
  ('spec002', 'bar001', 'FRIDAY', 'Fish Fry Friday', 'All-you-can-eat beer-battered cod with coleslaw and fries.', '$12.99', '16:00', '21:00', true, true, NOW(), NOW()),
  ('spec003', 'bar002', 'WEDNESDAY', 'Wine Wednesday', 'Half-price bottles of wine all evening.', NULL, '17:00', '22:00', false, true, NOW(), NOW()),
  ('spec004', 'bar002', 'FRIDAY', 'Lakeside Fish Fry', 'Award-winning perch and walleye plates with a view of the lake.', '$14.99', '16:00', '21:00', true, true, NOW(), NOW()),
  ('spec005', 'bar003', 'THURSDAY', 'Throwback Thursday', '$5 classic cocktails — Old Fashioneds, Manhattans, Gimlets.', '$5.00', '17:00', '23:00', false, true, NOW(), NOW()),
  ('spec006', 'bar003', 'SATURDAY', 'Live Music Night', 'Local bands every Saturday. No cover before 9pm.', NULL, '19:00', '01:00', false, true, NOW(), NOW());

-- Blog Post
INSERT INTO "blog_posts" ("id", "authorId", "title", "slug", "content", "excerpt", "category", "tags", "status", "publishedAt", "createdAt", "updatedAt")
VALUES ('post001', 'editor001', 'Welcome to the New I Love FDL!', 'welcome-to-i-love-fdl',
  '<p>We''re excited to launch the new I Love FDL platform — your one-stop destination for everything Fond du Lac.</p><p>Whether you''re looking to shop local, catch up on community news, or find the best daily specials in town, we''ve got you covered.</p><p>Our local marketplace connects you directly with Fond du Lac businesses. Every purchase supports our community and keeps money local.</p><p>Stay tuned for more features, more vendors, and more ways to love FDL!</p>',
  'We''re excited to launch the new I Love FDL platform — your one-stop destination for everything Fond du Lac.',
  'THE_FONDY_FRONTLINE', '{"announcement","community","launch"}', 'PUBLISHED', NOW(), NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@ilovefdl.com" },
    update: {},
    create: {
      email: "admin@ilovefdl.com",
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // Create editor user
  const editor = await prisma.user.upsert({
    where: { email: "editor@ilovefdl.com" },
    update: {},
    create: {
      email: "editor@ilovefdl.com",
      name: "Editor",
      role: "EDITOR",
    },
  });
  console.log(`Editor user: ${editor.email}`);

  // Create sample vendor user
  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@ilovefdl.com" },
    update: {},
    create: {
      email: "vendor@ilovefdl.com",
      name: "Sample Vendor",
      role: "VENDOR",
    },
  });

  // Create sample vendor
  const vendor = await prisma.vendor.upsert({
    where: { slug: "fond-du-lac-gifts" },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: "Fond du Lac Gifts",
      slug: "fond-du-lac-gifts",
      description:
        "Unique gifts and souvenirs celebrating Fond du Lac and Lake Winnebago.",
      status: "APPROVED",
      address: "123 Main St, Fond du Lac, WI 54935",
    },
  });
  console.log(`Vendor: ${vendor.businessName}`);

  // Create sample products
  const products = [
    {
      name: "Lake Winnebago Candle",
      slug: "lake-winnebago-candle",
      description:
        "Hand-poured soy candle inspired by the shores of Lake Winnebago. Notes of pine, fresh water, and wildflowers.",
      price: 24.99,
      images: [],
      categoryTags: ["gifts", "home"],
      inventory: 50,
    },
    {
      name: "FDL Lighthouse Print",
      slug: "fdl-lighthouse-print",
      description:
        "Beautiful watercolor print of the iconic Fond du Lac lighthouse. 8x10 on archival paper.",
      price: 35.0,
      images: [],
      categoryTags: ["art", "prints"],
      inventory: 25,
    },
    {
      name: "I Love FDL T-Shirt",
      slug: "i-love-fdl-tshirt",
      description:
        "Show your Fond du Lac pride with this comfortable cotton tee. Available in S-XXL.",
      price: 22.0,
      images: [],
      categoryTags: ["apparel", "shirts"],
      inventory: 100,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        ...product,
        vendorId: vendor.id,
      },
    });
  }
  console.log(`Created ${products.length} sample products`);

  // Create sample bars
  const bars = [
    {
      name: "Schmitty's Bar & Grill",
      slug: "schmittys-bar-and-grill",
      description:
        "A Fond du Lac favorite serving cold drinks and great food since 1985.",
      address: "456 Main St, Fond du Lac, WI 54935",
      phone: "(920) 555-0101",
    },
    {
      name: "Lakeside Tavern",
      slug: "lakeside-tavern",
      description:
        "Waterfront bar with stunning Lake Winnebago views and the best fish fry in town.",
      address: "789 Lakeshore Dr, Fond du Lac, WI 54935",
      phone: "(920) 555-0102",
    },
    {
      name: "The Retro",
      slug: "the-retro",
      description:
        "Downtown cocktail lounge with craft cocktails and live music on weekends.",
      address: "321 S Main St, Fond du Lac, WI 54935",
      phone: "(920) 555-0103",
    },
  ];

  const createdBars: { id: string; name: string }[] = [];
  for (const bar of bars) {
    const created = await prisma.bar.upsert({
      where: { slug: bar.slug },
      update: {},
      create: bar,
    });
    createdBars.push(created);
  }
  console.log(`Created ${bars.length} sample bars`);

  // Create sample specials
  const specials = [
    {
      barId: createdBars[0].id,
      dayOfWeek: "MONDAY" as const,
      title: "Monday Madness Wings",
      description: "50-cent wings all day. Dine-in only.",
      price: "$0.50/wing",
      startTime: "11:00",
      endTime: "22:00",
    },
    {
      barId: createdBars[0].id,
      dayOfWeek: "FRIDAY" as const,
      title: "Fish Fry Friday",
      description:
        "All-you-can-eat beer-battered cod with coleslaw and fries.",
      price: "$12.99",
      startTime: "16:00",
      endTime: "21:00",
      isFeatured: true,
    },
    {
      barId: createdBars[1].id,
      dayOfWeek: "WEDNESDAY" as const,
      title: "Wine Wednesday",
      description: "Half-price bottles of wine all evening.",
      startTime: "17:00",
      endTime: "22:00",
    },
    {
      barId: createdBars[1].id,
      dayOfWeek: "FRIDAY" as const,
      title: "Lakeside Fish Fry",
      description:
        "Award-winning perch and walleye plates with a view of the lake.",
      price: "$14.99",
      startTime: "16:00",
      endTime: "21:00",
      isFeatured: true,
    },
    {
      barId: createdBars[2].id,
      dayOfWeek: "THURSDAY" as const,
      title: "Throwback Thursday",
      description: "$5 classic cocktails — Old Fashioneds, Manhattans, Gimlets.",
      price: "$5.00",
      startTime: "17:00",
      endTime: "23:00",
    },
    {
      barId: createdBars[2].id,
      dayOfWeek: "SATURDAY" as const,
      title: "Live Music Night",
      description:
        "Local bands every Saturday. No cover before 9pm.",
      startTime: "19:00",
      endTime: "01:00",
    },
  ];

  for (const special of specials) {
    await prisma.special.create({ data: special });
  }
  console.log(`Created ${specials.length} sample specials`);

  // Create sample blog post
  await prisma.blogPost.upsert({
    where: { slug: "welcome-to-i-love-fdl" },
    update: {},
    create: {
      authorId: editor.id,
      title: "Welcome to the New I Love FDL!",
      slug: "welcome-to-i-love-fdl",
      content: `<p>We're excited to launch the new I Love FDL platform — your one-stop destination for everything Fond du Lac.</p>
<p>Whether you're looking to shop local, catch up on community news, or find the best daily specials in town, we've got you covered.</p>
<p>Our local marketplace connects you directly with Fond du Lac businesses. Every purchase supports our community and keeps money local.</p>
<p>Stay tuned for more features, more vendors, and more ways to love FDL!</p>`,
      excerpt:
        "We're excited to launch the new I Love FDL platform — your one-stop destination for everything Fond du Lac.",
      category: "THE_FONDY_FRONTLINE",
      tags: ["announcement", "community", "launch"],
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  console.log("Created sample blog post");

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

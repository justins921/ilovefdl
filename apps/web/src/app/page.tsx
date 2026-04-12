import Link from 'next/link';
import {
  ShoppingBag,
  Newspaper,
  Tag,
  ArrowRight,
  MapPin,
  Star,
  Clock,
  Users,
  Heart,
  Waves,
} from 'lucide-react';
import api from '@/lib/api';
import BlogPostCard from '@/components/BlogPostCard';
import SpecialCard from '@/components/SpecialCard';
import type { BlogPost, Special } from '@ilovefdl/shared';

// Re-generate this page at most every 60 seconds (ISR)
export const revalidate = 60;

async function getLatestPosts(): Promise<BlogPost[]> {
  try {
    const res = await api.getPosts({ limit: 3, status: 'PUBLISHED' });
    return res.data;
  } catch {
    return [];
  }
}

async function getTodaySpecials(): Promise<Special[]> {
  try {
    const res = await api.getTodaySpecials();
    return res.data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [latestPosts, todaySpecials] = await Promise.all([
    getLatestPosts(),
    getTodaySpecials(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-primary overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-teal/30" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-teal blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <Waves className="w-5 h-5 text-teal" />
              <span className="text-teal text-sm font-medium tracking-wide uppercase">
                On the shores of Lake Winnebago
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              I{' '}
              <Heart className="inline-block w-10 h-10 md:w-14 md:h-14 text-accent fill-accent" />{' '}
              FDL
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl">
              Your community hub for everything Fond du Lac. Shop local artisans
              and businesses, stay connected with community news, discover
              tonight&apos;s best specials, and celebrate what makes our city on
              the lake so special.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/marketplace" className="btn-primary text-lg px-8 py-4">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Shop Local
              </Link>
              <Link
                href="/news"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200 text-lg"
              >
                <Newspaper className="w-5 h-5 mr-2" />
                Read the News
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-4 sm:gap-8 text-white/50 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Fond du Lac, WI</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Community Driven</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>Locally Owned</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Fond du Lac Special */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-heading">What Makes Fond du Lac Special</h2>
            <p className="section-subheading max-w-2xl mx-auto">
              From the shores of Lake Winnebago to the heart of Main Street,
              discover everything our community has to offer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Local Marketplace */}
            <div className="card p-8 text-center group">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-accent/20 transition-colors">
                <ShoppingBag className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">
                Local Marketplace
              </h3>
              <p className="text-primary/60 leading-relaxed mb-6">
                Shop handmade goods, local products, and unique finds from Fond du Lac&apos;s
                talented artisans and small businesses. Every purchase supports
                a neighbor.
              </p>
              <Link
                href="/marketplace"
                className="inline-flex items-center text-accent font-semibold hover:gap-3 gap-2 transition-all"
              >
                Browse Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Community News */}
            <div className="card p-8 text-center group">
              <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-teal/20 transition-colors">
                <Newspaper className="w-8 h-8 text-teal" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">
                Community News
              </h3>
              <p className="text-primary/60 leading-relaxed mb-6">
                Stay in the know with The Fondy Frontline, meet our Faces of the
                Future, and explore stories that celebrate the spirit of our city.
              </p>
              <Link
                href="/news"
                className="inline-flex items-center text-teal font-semibold hover:gap-3 gap-2 transition-all"
              >
                Read Stories
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Daily Specials */}
            <div className="card p-8 text-center group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Tag className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">
                Daily Specials
              </h3>
              <p className="text-primary/60 leading-relaxed mb-6">
                Never miss a great deal. Check out today&apos;s food and drink specials
                at your favorite Fond du Lac bars and restaurants, updated daily.
              </p>
              <Link
                href="/specials"
                className="inline-flex items-center text-primary font-semibold hover:gap-3 gap-2 transition-all"
              >
                View Specials
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-20 bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="section-heading">Latest from the Community</h2>
              <p className="section-subheading">
                Stories, profiles, and news from around Fond du Lac
              </p>
            </div>
            <Link
              href="/news"
              className="hidden sm:inline-flex items-center gap-2 text-teal font-semibold hover:gap-3 transition-all"
            >
              View All News
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {latestPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestPosts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: 'Main Street Revival: New Shops Opening Downtown',
                  excerpt:
                    'Exciting changes are coming to downtown Fond du Lac as three new locally-owned shops prepare to open their doors this spring.',
                  category: 'The Fondy Frontline',
                },
                {
                  title: 'Youth Art Program Launches at Lakeside Park',
                  excerpt:
                    'A new initiative brings free art workshops to young creators at Lakeside Park every Saturday morning throughout the summer.',
                  category: 'Faces of our Future',
                },
                {
                  title: 'Weekend Guide: Best Family Activities Around the Lake',
                  excerpt:
                    'From the lighthouse trail to Saturday farmers markets, here are the top family-friendly activities this weekend in Fond du Lac.',
                  category: 'Play. Explore. Repeat.',
                },
              ].map((item, i) => (
                <div key={i} className="card">
                  <div className="aspect-[16/9] bg-gradient-to-br from-teal/20 to-accent/10 flex items-center justify-center">
                    <Newspaper className="w-12 h-12 text-teal/40" />
                  </div>
                  <div className="p-6">
                    <span className="badge-teal text-xs mb-3 inline-block">
                      {item.category}
                    </span>
                    <h3 className="font-bold text-primary text-lg mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-primary/60 text-sm line-clamp-3">
                      {item.excerpt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sm:hidden mt-8 text-center">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-teal font-semibold"
            >
              View All News
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Today's Specials Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-accent" />
                <span className="text-accent text-sm font-semibold uppercase tracking-wide">
                  Happening Now
                </span>
              </div>
              <h2 className="section-heading">Today&apos;s Specials</h2>
              <p className="section-subheading">
                The best deals at Fond du Lac bars and restaurants, right now
              </p>
            </div>
            <Link
              href="/specials"
              className="hidden sm:inline-flex items-center gap-2 text-accent font-semibold hover:gap-3 transition-all"
            >
              View All Specials
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {todaySpecials.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {todaySpecials.slice(0, 6).map((special) => (
                <SpecialCard key={special.id} special={special} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  bar: "Schmitty's Bar",
                  title: 'Taco Tuesday',
                  description: '$2 tacos and $3 margaritas all day long',
                  price: '$2',
                },
                {
                  bar: 'The Blu Pig',
                  title: 'Wing Wednesday',
                  description: 'Half-price wings with any drink purchase',
                  price: '50% off',
                },
                {
                  bar: 'Coliseum Sports Bar',
                  title: 'Happy Hour',
                  description: '$1 off all craft beers and rail drinks, 4-7 PM',
                  price: '$1 off',
                },
              ].map((item, i) => (
                <div key={i} className="card p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className="badge-accent">{item.bar}</span>
                    {item.price && (
                      <span className="text-accent font-bold text-lg">
                        {item.price}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-primary text-lg mb-1">
                    {item.title}
                  </h3>
                  <p className="text-primary/60 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="sm:hidden mt-8 text-center">
            <Link
              href="/specials"
              className="inline-flex items-center gap-2 text-accent font-semibold"
            >
              View All Specials
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Become a Vendor CTA */}
      <section className="py-20 bg-gradient-to-r from-teal to-teal/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto">
            <Star className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Own a Local Business?
            </h2>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Join the I Love FDL marketplace and reach your community directly.
              Set up your storefront, list your products, and connect with
              neighbors who want to shop local in Fond du Lac.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-teal font-bold rounded-lg hover:bg-cream transition-colors text-lg"
              >
                Become a Vendor
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="/vendors"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-lg"
              >
                See Our Vendors
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

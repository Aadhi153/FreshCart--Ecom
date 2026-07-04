'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Banknote, Clock3, Mail, MapPin, Phone, Quote, Radar, ShieldCheck, ShoppingBag, Sparkles, Star, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getFeaturedProducts, getBestSellers, getNewArrivals, getTopTestimonials, type HomeProductCard, type Testimonial } from '../lib/queries';
import { gridVariants, itemVariants } from '../lib/motion';
import { ProductImage } from '../components/ProductImage';
import styles from './page.module.css';

const categories = ['Eggs', 'Coconuts', 'Vegetables', 'T-Shirts', 'Snacks'];

const featuredProducts = [
  {
    id: 1,
    name: 'Farm Fresh Brown Eggs',
    price: 149,
    category: 'Eggs',
    image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 2,
    name: 'Tender Coconut',
    price: 89,
    category: 'Coconuts',
    image: 'https://images.unsplash.com/photo-1580984969071-a8da5656c2fb?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 3,
    name: 'Organic Carrots',
    price: 75,
    category: 'Vegetables',
    image: 'https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=700&q=80',
  },
];

const heroTiles = [
  {
    label: 'Fresh vegetables',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Daily essentials',
    image: 'https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=700&q=80',
  },
  {
    label: 'Fast delivery',
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=700&q=80',
  },
];

function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className={styles.testimonialsSection}>
      <div className={styles.sectionHeader}>
        <span>Loved by shoppers</span>
        <h2 className={styles.sectionTitle}>What customers are saying</h2>
      </div>
      <motion.div
        className={styles.testimonialGrid}
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        {testimonials.map((t) => (
          <motion.article
            key={t.id}
            className={styles.testimonialCard}
            variants={itemVariants}
            whileHover={{ y: -4 }}
          >
            <Quote size={20} className={styles.quoteIcon} />
            <div className={styles.testimonialStars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} fill={i < t.rating ? '#F4A261' : 'none'} color="#F4A261" />
              ))}
            </div>
            <p className={styles.testimonialComment}>&ldquo;{t.comment}&rdquo;</p>
            <div className={styles.testimonialFooter}>
              <strong>{t.reviewerName}</strong>
              <span>on {t.productName}</span>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

function ProductSection({ kicker, title, products }: { kicker: string; title: string; products: HomeProductCard[] }) {
  if (products.length === 0) return null;

  return (
    <section className={styles.featuredSection}>
      <div className={styles.sectionHeader}>
        <span>{kicker}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      <motion.div
        className={styles.productGrid}
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        {products.map((product) => (
          <motion.article
            key={product.id}
            className={styles.productCard}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.99 }}
          >
            <Link href={`/shop/${product.id}`} className={styles.productImageLink} aria-label={`Shop ${product.name}`}>
              <ProductImage src={product.image} alt={product.name} sizes="(max-width: 900px) 100vw, 33vw" className={styles.productImage} />
            </Link>
            <div className={styles.productBody}>
              <span>{product.category}</span>
              <h3>{product.name}</h3>
              <div className={styles.productFooter}>
                <strong>&#8377;{product.price.toFixed(2)}</strong>
                <Link href={`/shop/${product.id}`} className={styles.addButton}>
                  <ShoppingBag size={16} />
                  Shop
                </Link>
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

export default function LandingPage() {
  const [session, setSession] = useState<Session | null>(null);
  // Falls back to the static mock list (whose numeric ids aren't real product ids,
  // so those cards link to /shop generically) until real featured products load.
  const [featured, setFeatured] = useState<{ id: string | number; name: string; price: number; category: string; image: string }[]>(featuredProducts);
  const [bestSellers, setBestSellers] = useState<HomeProductCard[]>([]);
  const [newArrivals, setNewArrivals] = useState<HomeProductCard[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Sections are deduped against each other (fetch a small surplus, then filter)
    // so the same handful of products don't repeat across all three homepage rows.
    async function loadSections() {
      const featuredData = await getFeaturedProducts(3);
      if (featuredData.length > 0) setFeatured(featuredData);
      const featuredIds = new Set(featuredData.map((p) => p.id));

      const bestSellersData = await getBestSellers(6);
      const dedupedBestSellers = bestSellersData.filter((p) => !featuredIds.has(p.id)).slice(0, 4);
      setBestSellers(dedupedBestSellers);
      const shownIds = new Set([...featuredIds, ...dedupedBestSellers.map((p) => p.id)]);

      const newArrivalsData = await getNewArrivals(6);
      setNewArrivals(newArrivalsData.filter((p) => !shownIds.has(p.id)).slice(0, 4));
    }
    loadSections();
    getTopTestimonials(6).then(setTestimonials);
  }, []);

  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const backdropY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, -90]);
  const visualY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, -40]);

  return (
    <main className={styles.main}>
      <section className={styles.heroSection} ref={heroRef}>
        <motion.div className={styles.heroBackdrop} aria-hidden="true" style={{ y: backdropY }}>
          <span className={`${styles.meshOrb} ${styles.meshOrbOne}`} />
          <span className={`${styles.meshOrb} ${styles.meshOrbTwo}`} />
          <span className={`${styles.meshOrb} ${styles.meshOrbThree}`} />
          <span className={styles.gridGlow} />
          <span className={`${styles.floatShape} ${styles.floatShapeOne}`} />
          <span className={`${styles.floatShape} ${styles.floatShapeTwo}`} />
          <span className={`${styles.floatShape} ${styles.floatShapeThree}`} />
        </motion.div>

        <div className={styles.heroContent}>
          <div className={styles.heroKicker}>
            <Sparkles size={16} />
            FreshCart everyday delivery
          </div>
          <h1 className={styles.heroHeadline}>Farm fresh groceries, delivered fast.</h1>
          <p className={styles.heroSubheadline}>
            Shop produce, pantry staples, snacks, and daily essentials from one clean, fast storefront.
          </p>
          <div className={styles.heroActions}>
            <motion.div style={{ display: 'inline-block' }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link href="/shop" className={styles.primaryButton}>
                Shop Now
                <ArrowRight size={18} />
              </Link>
            </motion.div>
          </div>


          <div className={styles.heroMetrics} aria-label="Store highlights">
            <div>
              <strong>30 min</strong>
              <span>average delivery</span>
            </div>
            <div>
              <strong>4.9/5</strong>
              <span>customer rating</span>
            </div>
            <div>
              <strong>10k+</strong>
              <span>orders delivered</span>
            </div>
          </div>
        </div>

        <motion.div className={styles.heroVisual} aria-label="Fresh groceries preview" style={{ y: visualY }}>
          <div className={styles.visualRail}>
            {heroTiles.map((tile, index) => (
              <div key={tile.label} className={`${styles.heroTile} ${styles[`heroTile${index + 1}`]}`}>
                <Image
                  src={tile.image}
                  alt={tile.label}
                  fill
                  sizes="(max-width: 900px) 60vw, 30vw"
                  style={{ objectFit: 'cover' }}
                  preload={index === 0}
                />
              </div>
            ))}
          </div>
          <div className={styles.deliveryCard}>
            <Truck size={20} />
            <div>
              <strong>On the way</strong>
              <span>Fresh basket arriving soon</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section className={styles.trustBar} aria-label="Why shop with FreshCart">
        <div className={styles.trustItem}>
          <Banknote size={20} />
          <div>
            <strong>Cash on Delivery</strong>
            <span>Pay when your order arrives</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <Radar size={20} />
          <div>
            <strong>Live Order Tracking</strong>
            <span>Know exactly where your basket is</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <ShieldCheck size={20} />
          <div>
            <strong>Freshness Guaranteed</strong>
            <span>Checked before every dispatch</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <Truck size={20} />
          <div>
            <strong>30-Min Delivery</strong>
            <span>Fast dispatch on daily essentials</span>
          </div>
        </div>
      </section>

      <section className={styles.categoriesSection}>
        <div className={styles.sectionHeader}>
          <span>Browse faster</span>
          <h2 className={styles.sectionTitle}>Shop by Category</h2>
        </div>
        <motion.div
          className={styles.categoryPills}
          variants={gridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          {categories.map((cat) => (
            <motion.div key={cat} variants={itemVariants} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
              <Link href={`/shop?category=${encodeURIComponent(cat)}`} className={styles.categoryPill}>
                {cat}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className={styles.featuredSection}>
        <div className={styles.sectionHeader}>
          <span>Fresh picks</span>
          <h2 className={styles.sectionTitle}>Featured Products</h2>
        </div>
        <motion.div
          className={styles.productGrid}
          variants={gridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {featured.map((product) => {
            // Real products loaded from Supabase have string (UUID) ids; the static
            // fallback list uses numeric placeholder ids that don't exist in the DB.
            const href = typeof product.id === 'string' ? `/shop/${product.id}` : '/shop';
            return (
              <motion.article
                key={product.id}
                className={styles.productCard}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.99 }}
              >
                <Link href={href} className={styles.productImageLink} aria-label={`Shop ${product.name}`}>
                  <ProductImage src={product.image} alt={product.name} sizes="(max-width: 900px) 100vw, 33vw" className={styles.productImage} />
                </Link>
                <div className={styles.productBody}>
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <div className={styles.productFooter}>
                    <strong>&#8377;{product.price.toFixed(2)}</strong>
                    <Link href={href} className={styles.addButton}>
                      <ShoppingBag size={16} />
                      Shop
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </section>

      <ProductSection kicker="Top rated" title="Best Sellers" products={bestSellers} />
      <ProductSection kicker="Just landed" title="New Arrivals" products={newArrivals} />

      <TestimonialsSection testimonials={testimonials} />

      <section id="about" className={styles.aboutSection}>
        <div className={styles.aboutCopy}>
          <div className={styles.sectionHeaderLeft}>
            <span>About Us</span>
            <h2 className={styles.sectionTitle}>Built for fresh everyday shopping.</h2>
          </div>
          <p>
            FreshCart brings local produce, snacks, pantry essentials, and daily household picks into one fast storefront.
            We focus on clear availability, careful packing, and quick delivery so grocery runs take less time.
          </p>
        </div>
        <div className={styles.aboutStats}>
          <div>
            <strong>Local</strong>
            <span>Nearby sourcing and inventory</span>
          </div>
          <div>
            <strong>Fresh</strong>
            <span>Quality checks before dispatch</span>
          </div>
          <div>
            <strong>Fast</strong>
            <span>Designed for daily repeat orders</span>
          </div>
        </div>
      </section>

      <section id="contact" className={styles.contactSection}>
        <div className={styles.sectionHeader}>
          <span>Contact Us</span>
          <h2 className={styles.sectionTitle}>Need help with an order?</h2>
        </div>
        <motion.div
          className={styles.contactGrid}
          variants={gridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.a href="mailto:support@freshcart.local" className={styles.contactItem} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Mail size={22} />
            <div>
              <strong>Email</strong>
              <span>support@freshcart.local</span>
            </div>
          </motion.a>
          <motion.a href="tel:+910000000000" className={styles.contactItem} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Phone size={22} />
            <div>
              <strong>Phone</strong>
              <span>+91 00000 00000</span>
            </div>
          </motion.a>
          <motion.div className={styles.contactItem} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }}>
            <MapPin size={22} />
            <div>
              <strong>Service Area</strong>
              <span>Local grocery delivery</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        className={styles.promiseSection}
        aria-label="FreshCart promises"
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div className={styles.promiseItem} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }}>
          <Clock3 size={22} />
          <div>
            <strong>Fast dispatch</strong>
            <span>Packed and routed quickly for daily orders.</span>
          </div>
        </motion.div>
        <motion.div className={styles.promiseItem} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }}>
          <ShieldCheck size={22} />
          <div>
            <strong>Quality checked</strong>
            <span>Freshness checks before every delivery.</span>
          </div>
        </motion.div>
        <motion.div className={styles.promiseItem} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }}>
          <Truck size={22} />
          <div>
            <strong>Local delivery</strong>
            <span>Essentials delivered from nearby inventory.</span>
          </div>
        </motion.div>
      </motion.section>

    </main>
  );
}

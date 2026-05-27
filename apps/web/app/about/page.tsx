"use cache";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Globe, Award, TrendingUp, CheckCircle } from "lucide-react";

export default async function AboutPage() {
  // Direct image URL for mill facility (public view)
  const millImageUrl =
    "https://yousufricemill.com/v1/storage/buckets/69b54a6f001d2c036ee4/files/69b54a83003010a40e38/view?project=69b54919003a3b212c96";

  const stats = [
    {
      icon: Package,
      label: "Export Capacity",
      value: "150+",
      subtitle: "Containers per month",
    },
    {
      icon: Globe,
      label: "Global Reach",
      value: "6+",
      subtitle: "Major countries",
    },
    {
      icon: Award,
      label: "Premium Quality",
      value: "100%",
      subtitle: "State of the art facilities",
    },
    {
      icon: TrendingUp,
      label: "Market Leader",
      value: "#1",
      subtitle: "In UAE hypermarkets",
    },
  ];

  const varieties = [
    { name: "1121 Sella Rice", description: "Premium Long Grain Basmati Rice" },
    { name: "1121 Steam Sella", description: "High Quality Aromatic Basmati" },
    {
      name: "Various Premium Varieties",
      description: "Wide selection for all needs",
    },
  ];

  const markets = [
    "United Arab Emirates",
    "Oman",
    "Iraq",
    "Kenya",
    "Philippines",
    "Malaysia",
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="relative bg-[#27247b] text-white overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-[#27247b] to-[#27247b]/80"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              About <span className="text-[#ffff03]">Yousuf Rice</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Exporting Premium Quality Rice from Pakistan to the World
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-2 border-[#ffff03]/30 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <CardContent className="p-6 text-center">
                <stat.icon className="w-10 h-10 text-[#27247b] mx-auto mb-3" />
                <p className="text-3xl font-bold text-[#27247b] mb-1">
                  {stat.value}
                </p>
                <p className="text-sm font-bold text-gray-900">{stat.label}</p>
                <p className="text-xs text-gray-600 mt-1">{stat.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Our Story Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-4xl font-bold text-[#27247b] mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p className="text-lg">
                <strong className="text-[#27247b]">Yousuf Rice</strong> is a
                leading exporter of premium quality rice from Pakistan, serving
                major markets across the globe. We specialize in delivering
                excellence through our carefully selected rice varieties,
                directly harvested from state-of-the-art facilities in
                Pakistan's grain hub.
              </p>
              <p>
                With an impressive export capacity of{" "}
                <strong>150 containers per month</strong>, we have established
                ourselves as a trusted partner for businesses worldwide. Our
                commitment to quality and reliability has made us the preferred
                choice for major hypermarkets, including{" "}
                <strong>Union Coop</strong> in the UAE.
              </p>
              <p>
                Operating under <strong>S.S.I Foodstuff Trading</strong>, we are
                renowned for our expertise in 1121 Sella Rice and long grain
                1121 Steam Basmati. Our flexible packaging options range from
                convenient 5kg bags to bulk 25kg and 50kg master bags, catering
                to diverse customer needs.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-4/3 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-[#ffff03]/40 hover:ring-[#ffff03]/60 transition-all">
              <Image
                src={millImageUrl}
                alt="Yousuf Rice Mill Facility"
                fill
                className="object-cover p-2"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={80}
              />
            </div>
          </div>
        </div>

        {/* Rice Varieties Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-[#27247b] mb-8 text-center">
            Our Premium Rice Varieties
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {varieties.map((variety, index) => (
              <Card
                key={index}
                className="border-2 border-[#27247b]/20 hover:border-[#ffff03] transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-[#27247b] mb-2">
                        {variety.name}
                      </h3>
                      <p className="text-gray-600">{variety.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Global Mark
        ets Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-[#27247b] mb-8 text-center">
            Global Markets We Serve
          </h2>
          <Card className="border-2 border-[#ffff03]/50 bg-linear-to-br from-white to-[#ffff03]/5">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-6">
                {markets.map((market, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <Globe className="w-6 h-6 text-[#27247b]" />
                    <span className="font-semibold text-gray-900">
                      {market}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Packaging Options */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-[#27247b] mb-8 text-center">
            Flexible Packaging Options
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { size: "5kg Bags", description: "Perfect for retail customers" },
              {
                size: "25kg Bags",
                description: "Ideal for restaurants & businesses",
              },
              {
                size: "50kg Master Bags",
                description: "Bulk orders & wholesale",
              },
            ].map((pack, index) => (
              <Card
                key={index}
                className="border-2 border-[#27247b]/20 text-center hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-8">
                  <Package className="w-12 h-12 text-[#27247b] mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-[#27247b] mb-2">
                    {pack.size}
                  </h3>
                  <p className="text-gray-600">{pack.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-linear-to-br from-[#27247b] to-[#27247b]/90 rounded-3xl p-12 text-white text-center">
          <h2 className="text-4xl font-bold mb-6">Why Choose Yousuf Rice?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            {[
              {
                icon: Award,
                title: "Premium Quality",
                desc: "State-of-the-art facilities",
              },
              {
                icon: Globe,
                title: "Global Reach",
                desc: "Serving 6+ countries",
              },
              {
                icon: TrendingUp,
                title: "Reliable Supply",
                desc: "150+ containers monthly",
              },
              {
                icon: CheckCircle,
                title: "Trusted Partner",
                desc: "Major hypermarkets",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <item.icon className="w-12 h-12 text-[#ffff03] mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-white/80 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

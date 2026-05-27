import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yousuf Rice",
    short_name: "Yousuf Rice",
    description:
      "Order premium quality basmati and sella rice online with big discounts on 10 kg and plus, free delivery, and cash on delivery",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#27247b",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

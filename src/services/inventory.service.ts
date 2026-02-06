import axios from "axios";

const SERP_BASE = "https://serpapi.com/search.json";

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function resolveDates(checkIn?: string, checkOut?: string) {
  if (checkIn && checkOut) return { checkIn, checkOut };

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  return { checkIn: formatDate(today), checkOut: formatDate(tomorrow) };
}

export async function searchHotels(
  query: string,
  checkIn?: string,
  checkOut?: string,
  adults = 2,
) {
  if (!query) throw new Error("Query is required");

  const dates = resolveDates(checkIn, checkOut);

  const { data } = await axios.get(SERP_BASE, {
    params: {
      engine: "google_hotels",
      q: query,
      check_in_date: dates.checkIn,
      check_out_date: dates.checkOut,
      adults,
      currency: "INR",
      gl: "us",
      hl: "en",
      api_key: process.env.SERP_API_KEY,
    },
  });

  return {
    ads: (data.ads || []).map((a: any) => ({
      id: a.property_token,
      name: a.name,
      price: a.extracted_price,
      image: a.thumbnail,
      rating: a.overall_rating,
      reviews: a.reviews,
      source: a.source,
      amenities: a.amenities || [],
      propertyToken: a.property_token,
    })),

    properties: (data.properties || []).map((p: any) => ({
      id: p.property_token,
      name: p.name,
      price: p.rate_per_night?.extracted_lowest ?? null,
      image: p.images?.[0]?.thumbnail ?? null,
      rating: p.overall_rating,
      reviews: p.reviews,
      type: p.type,
      amenities: p.amenities || [],
      propertyToken: p.property_token,
    })),
  };
}

export async function getHotelDetails(params: {
  q: string;
  propertyToken: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
}) {
  const { q, propertyToken, checkIn, checkOut } = params;
  const adults = params.adults ?? 2;

  if (!q) throw new Error("q is required");
  if (!propertyToken) throw new Error("propertyToken is required");

  const dates = resolveDates(checkIn, checkOut);

  const { data } = await axios.get(SERP_BASE, {
    params: {
      engine: "google_hotels",
      q,
      property_token: propertyToken,
      check_in_date: dates.checkIn,
      check_out_date: dates.checkOut,
      adults,
      currency: "INR",
      gl: "us",
      hl: "en",
      api_key: process.env.SERP_API_KEY,
    },
  });

  // Normalize only what frontend needs
  return {
    propertyToken: data.property_token ?? propertyToken,
    name: data.name ?? "",
    type: data.type ?? "",
    description: data.description ?? "",
    link: data.link ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    checkInTime: data.check_in_time ?? "",
    checkOutTime: data.check_out_time ?? "",
    ratePerNight: data.rate_per_night?.extracted_lowest ?? null,
    images: (data.images || []).map((img: any) => ({
      thumbnail: img.thumbnail,
      original: img.original_image,
    })),
    featuredPrices: (data.featured_prices || []).map((fp: any) => ({
      source: fp.source,
      link: fp.link,
      logo: fp.logo,
      remarks: fp.remarks || [],
      ratePerNight: fp.rate_per_night?.extracted_lowest ?? null,
      rooms: (fp.rooms || []).map((r: any) => ({
        name: r.name,
        link: r.link,
        images: r.images || [],
        ratePerNight: r.rate_per_night?.extracted_lowest ?? null,
      })),
    })),
  };
}

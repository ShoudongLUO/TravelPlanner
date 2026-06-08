export interface Attraction {
  name: string
  name_en: string
  description: string
  icon: string
}

export interface BudgetBreakdown {
  transport: number
  local_transport: number
  accommodation: number
  food: number
  tickets: number
  misc: number
}

export interface AccommodationArea {
  area: string
  description: string
  price_range: string
  vibe: string
}

export interface TimelineItem {
  time: string
  name: string
  name_en: string
  description: string
}

export interface Restaurant {
  name: string
  location: string
  reason: string
  dishes: string
  price_range: string
}

export interface DayPlan {
  title: string
  attractions: string[]
  timeline: TimelineItem[]
  lunch: Restaurant
  dinner: Restaurant
  daily_budget: number
}

export interface ItineraryContent {
  summary: string
  days: DayPlan[]
  budget_breakdown: BudgetBreakdown
  accommodations: AccommodationArea[]
  tips: string[]
  xhs_queries: string[]
}

export interface YoutubeVideo {
  id: string
  title: string
  thumbnail: string
  url: string
}

export interface Itinerary {
  id: string
  user_id: string
  departure_city: string
  destination: string
  start_date: string
  days: number
  budget: number
  travelers: number
  content: ItineraryContent
  youtube_videos: YoutubeVideo[]
  created_at: string
  destination_lat: number | null
  destination_lng: number | null
  destination_country: string | null
  visited: boolean
}

export interface ItineraryReview {
  id: string
  itinerary_id: string
  user_id: string
  rating: number
  actual_budget: number
  highlights: string
  improvements: string
  visited_at: string
  created_at: string
}

export interface GenerateRequest {
  departure_city: string
  destination: string
  start_date: string
  days: number
  budget: number
  travelers: number
  preferred_attractions: string[]
  // HH:MM 24-hour. Optional in request; defaults applied in route handler.
  outbound_depart_time?: string
  outbound_arrive_time?: string
  return_depart_time?: string
  return_arrive_time?: string
  user_profile?: UserProfile
}

export type ReviewStatus = 'pending' | 'visited_no_review' | 'reviewed'

export interface ItinerarySummary {
  id: string
  departure_city: string
  destination: string
  start_date: string
  days: number
  budget: number
  created_at: string
  review_status: ReviewStatus
}

export interface UserProfile {
  user_id: string
  travel_styles: string[]
  pace: string
  budget_style: string
  created_at: string
  updated_at: string
}

export interface BudgetBreakdown {
  transport: number
  accommodation: number
  food: number
  tickets: number
  misc: number
}

export interface DayPlan {
  title: string
  activities: string[]
}

export interface ItineraryContent {
  summary: string
  days: DayPlan[]
  budget_breakdown: BudgetBreakdown
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
  content: ItineraryContent
  youtube_videos: YoutubeVideo[]
  created_at: string
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

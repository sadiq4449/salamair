from enum import Enum


class RequestStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    rm_pending = "rm_pending"
    approved = "approved"
    rejected = "rejected"
    counter_offered = "counter_offered"


class RequestPriority(str, Enum):
    normal = "normal"
    urgent = "urgent"


class CounterOfferStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"

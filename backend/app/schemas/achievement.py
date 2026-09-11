from pydantic import BaseModel


class AchievementRead(BaseModel):
    id: str
    name: str
    description: str
    rarity: str
    ap: int
    unlocked: bool


class PlayerAchievements(BaseModel):
    cfn_id: str
    total_ap: int
    achievements: list[AchievementRead]


class AchievementLeaderboardEntry(BaseModel):
    cfn_id: str
    display_name: str
    avatar_url: str | None
    total_ap: int
    master_rating: int | None

"""
Category model: a user-defined label with a name and color.
Tasks link to categories via category_id.
"""
from sqlalchemy import Column, Integer, String
from database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)  # unique browser ID
    name = Column(String, nullable=False)
    color = Column(String, default="#3B82F6")  # hex color for badge/stripe

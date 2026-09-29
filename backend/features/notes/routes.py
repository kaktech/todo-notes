"""
Note API endpoints: create, read, update, delete.
Uses the separate notes database.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database_notes import get_notes_db, NotesBase, notes_engine
from features.notes.models import Note
from features.notes.schemas import NoteCreate, NoteUpdate, NoteResponse

# Create notes tables
NotesBase.metadata.create_all(bind=notes_engine)

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=list[NoteResponse])
def get_notes(
    user_id: str = Query(..., description="Unique browser ID of the user"),
    search: Optional[str] = Query(None, description="Search notes by title or content"),
    db: Session = Depends(get_notes_db),
):
    """Get all notes for a specific user, optionally searched."""
    query = db.query(Note).filter(Note.user_id == user_id)

    if search:
        query = query.filter(
            Note.title.ilike(f"%{search}%") | Note.content.ilike(f"%{search}%")
        )

    return query.order_by(Note.updated_at.desc()).all()


@router.post("", response_model=NoteResponse, status_code=201)
def create_note(note: NoteCreate, db: Session = Depends(get_notes_db)):
    """Create a new note."""
    db_note = Note(user_id=note.user_id, title=note.title, content=note.content)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_notes_db)):
    """Get a single note by ID."""
    db_note = db.query(Note).filter(Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(note_id: int, note_update: NoteUpdate, db: Session = Depends(get_notes_db)):
    """Update a note's title and/or content."""
    db_note = db.query(Note).filter(Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    if note_update.title is not None:
        db_note.title = note_update.title
    if note_update.content is not None:
        db_note.content = note_update.content

    db_note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_note)
    return db_note


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_notes_db)):
    """Delete a note by ID."""
    db_note = db.query(Note).filter(Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(db_note)
    db.commit()

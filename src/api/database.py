"""
database.py — Configuración de base de datos PostgreSQL.

Maneja la conexión a la base de datos y define el modelo SQLAlchemy
para registrar todas las predicciones y el feedback médico.
"""

import logging
import os
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

# Configuración de conexión (valores por defecto para dev local si no hay env)
POSTGRES_USER = os.getenv("POSTGRES_USER", "medvision_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "medvision_dev_2024")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "medvision")

DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

Base = declarative_base()

class PredictionLog(Base):
    """Modelo para registrar predicciones y feedback en PostgreSQL."""
    __tablename__ = "predictions_log"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Datos de predicción
    predicted_class = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    inference_time_ms = Column(Float, nullable=False)
    
    # Rutas de archivos
    heatmap_path = Column(String, nullable=True)
    
    # Feedback del especialista (para reentrenamiento)
    corrected_class = Column(Integer, nullable=True)
    clinical_notes = Column(Text, nullable=True)
    feedback_timestamp = Column(DateTime, nullable=True)


# Crear Engine y SessionLocal
try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    logger.info("Base de datos PostgreSQL inicializada correctamente.")
except Exception as e:
    logger.error("No se pudo conectar a PostgreSQL. El logging fallará: %s", e)
    SessionLocal = None


def get_db():
    """Dependency para inyectar sesión de BD en FastAPI."""
    if SessionLocal is None:
        yield None
        return
        
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

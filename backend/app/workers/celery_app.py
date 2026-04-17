from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "licit_ia",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.ingesta", "app.workers.pipeline"],
)

celery_app.conf.beat_schedule = {
    "ingesta-incremental": {
        "task": "app.workers.ingesta.incremental_ingesta",
        "schedule": crontab(minute=0, hour="*/6"),
    },
}

celery_app.conf.task_routes = {
    "app.workers.ingesta.*": {"queue": "ingesta"},
    "app.workers.pipeline.*": {"queue": "pipeline"},
}

celery_app.conf.timezone = "America/Mexico_City"

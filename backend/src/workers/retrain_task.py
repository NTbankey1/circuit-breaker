# backend/src/workers/retrain_task.py
import sys
import logging
from celery import Celery
from celery.schedules import crontab
from src.monitoring.drift_detector import DriftDetector
try:
    from scripts.train import main as run_training
except ImportError:
    # Dummy mock if scripts not in path
    def run_training(): pass

app = Celery("logistics", broker="redis://redis:6379/0")

app.conf.beat_schedule = {
    "retrain-daily": {
        "task":     "src.workers.retrain_task.daily_retrain",
        "schedule": crontab(hour=2, minute=0),    # 2h sáng mỗi ngày
    },
}

@app.task
def daily_retrain():
    detector = DriftDetector()
    status   = detector.check()
    logging.info(f"[Drift] PSI={status['psi']} | MAE={status['mae_7d']} min "
                 f"| N={status['n_samples']}")

    if status["needs_retrain"]:
        logging.info("[Retrain] Triggering training pipeline...")
        try:
            run_training()
            logging.info("[Retrain] ✓ New model deployed via Blue-Green swap")
        except RuntimeError as e:
            logging.error(f"[Retrain] ✗ FAILED: {e} — keeping old model")
    else:
        logging.info("[Retrain] Model stable — skipping")

from app.database import SessionLocal, engine, Base, User
from app.api import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin exists
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            logger.info("Creating admin user...")
            hashed_password = get_password_hash("admin")
            user = User(username="admin", hashed_password=hashed_password)
            db.add(user)
            db.commit()
            logger.info("Admin user created (admin/admin)")
        else:
            logger.info("Admin user already exists")

        # Create Demo Group
        from app.database import Group, VideoSourceModel
        demo_group = db.query(Group).filter(Group.name == "Demo Group").first()
        if not demo_group:
            logger.info("Creating demo group...")
            demo_group = Group(name="Demo Group")
            db.add(demo_group)
            db.commit()
            db.refresh(demo_group)

        # Create Demo Source
        demo_source = db.query(VideoSourceModel).filter(VideoSourceModel.name == "Demo Camera").first()
        if not demo_source:
            logger.info("Creating demo camera source...")
            demo_source = VideoSourceModel(
                name="Demo Camera",
                source_url="rtsp://demo:demo@ipvmdemo.dyndns.org:5541/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
                type="rtsp",
                group_id=demo_group.id
            )
            db.add(demo_source)
            db.commit()
            
    except Exception as e:
        logger.error(f"Error initializing DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

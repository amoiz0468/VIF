import sys
from app.database import SessionLocal
from app import models
from app.services.shopkeeper import generate_cerfa_report

def main():
    db = SessionLocal()
    try:
        shop = db.query(models.Shop).first()
        if not shop:
            print("No shops found in database.")
            return
        print(f"Testing generate_cerfa_report for shop {shop.name} (ID: {shop.id})...")
        report, pdf_path = generate_cerfa_report(db, shop.id, 2026, 5)
        print("Success!")
        print(f"Report ID: {report.id}")
        print(f"PDF Path: {pdf_path}")
    except Exception as e:
        print("Error during report generation:")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()

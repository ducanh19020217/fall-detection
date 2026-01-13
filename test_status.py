import requests

API_URL = "http://localhost:8000"

def test_status():
    # Login to get token
    res = requests.post(f"{API_URL}/api/token", data={"username": "admin", "password": "admin"})
    if res.status_code != 200:
        print("Login failed")
        return
    
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get status
    res = requests.get(f"{API_URL}/api/pipeline/status", headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Data: {res.json()}")

if __name__ == "__main__":
    test_status()

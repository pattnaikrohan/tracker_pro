import requests

def seed():
    # Create Project 1
    p1 = requests.post("http://localhost:8000/api/projects", json={
        "title": "E-Commerce Platform Modernization",
        "description": "Revamping the frontend architecture and improving payment gateway integrations to boost conversion rates."
    }).json()

    # Create Project 2
    p2 = requests.post("http://localhost:8000/api/projects", json={
        "title": "Customer Portal Re-architecture",
        "description": "Moving legacy customer portal to a microservices architecture to improve scalability and uptime."
    }).json()

    # Add Change Requests to Project 1
    cr1 = requests.post(f"http://localhost:8000/api/projects/{p1['id']}/requests", json={
        "title": "Add Apple Pay Support",
        "request_text": "We need to integrate Apple Pay as a payment option on the checkout page. This was highly requested by mobile users.",
        "type": "New Feature",
        "priority": "High"
    }).json()

    requests.put(f"http://localhost:8000/api/requests/{cr1['id']}", json={
        "status": "In Progress",
        "complexity": "Medium"
    })

    # Add comments
    requests.post(f"http://localhost:8000/api/requests/{cr1['id']}/comments", json={
        "author_role": "AAW",
        "text": "Can we get this done by next sprint? Mobile conversions are dropping."
    })
    requests.post(f"http://localhost:8000/api/requests/{cr1['id']}/comments", json={
        "author_role": "Cozentus",
        "text": "We have the API keys. Integration is underway, testing on sandbox."
    })

    # Another CR
    cr2 = requests.post(f"http://localhost:8000/api/projects/{p1['id']}/requests", json={
        "title": "Fix Cart Synchronization Bug",
        "request_text": "Items added on mobile web are not showing up when logging into desktop. Needs urgent fix.",
        "type": "Bug Fix",
        "priority": "Critical"
    }).json()

    requests.put(f"http://localhost:8000/api/requests/{cr2['id']}", json={
        "status": "Completed",
        "complexity": "High"
    })

    requests.post(f"http://localhost:8000/api/requests/{cr2['id']}/comments", json={
        "author_role": "Cozentus",
        "text": "Found the race condition in the session state. Patch deployed to production."
    })

    # Project 2 requests
    cr3 = requests.post(f"http://localhost:8000/api/projects/{p2['id']}/requests", json={
        "title": "Implement OAuth2 with Active Directory",
        "request_text": "Enterprise clients want to use their Azure AD to SSO into the customer portal.",
        "type": "Enhancement",
        "priority": "Medium"
    }).json()

    print("Seeding complete!")

if __name__ == "__main__":
    seed()

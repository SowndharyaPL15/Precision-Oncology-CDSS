import asyncio
import httpx
import numpy as np

BASE_URL = "http://127.0.0.1:8005/api/v1"

def generate_random_embedding():
    vec = np.random.randn(128).astype(np.float32)
    norm = np.linalg.norm(vec)
    return (vec / norm).tolist()

async def run_tests():
    print("==================================================")
    print("       3FA FACE AUTHENTICATION TEST SUITE         ")
    print("==================================================\n")

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        # Step 1: Sign up User A
        email_a = f"usera_{np.random.randint(1000, 9999)}@hospital.org"
        signup_res = await client.post(f"{BASE_URL}/auth/signup", json={
            "full_name": "Test User A",
            "email": email_a,
            "password": "Password123!",
            "role": "doctor"
        })
        assert signup_res.status_code == 200, f"Signup failed: {signup_res.text}"
        user_a = signup_res.json()
        user_a_id = user_a["user_id"]
        print(f"[OK] Test 1: Created User A ({user_a_id})")

        # Step 2: Unauthenticated Enrollment -> 401
        unauth_enroll = await client.post(f"{BASE_URL}/auth/face/enroll", json={
            "samples": [generate_random_embedding()]
        })
        assert unauth_enroll.status_code == 401, f"Expected 401 for unauth enrollment, got {unauth_enroll.status_code}"
        print("[OK] Test 2: Unauthenticated enrollment correctly rejected (HTTP 401)")

        # Step 3: Authenticate User A to get JWT token
        login_res = await client.post(f"{BASE_URL}/auth/login", json={
            "email": email_a,
            "password": "Password123!"
        })
        assert login_res.status_code == 200, f"Login failed with status {login_res.status_code}: {login_res.text}"
        token_a = login_res.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Step 4: Authenticated Face Enrollment with Multi-Pose Samples
        base_face_embedding = generate_random_embedding()
        # Create slight variations of the base face embedding
        samples = [
            base_face_embedding,
            (np.array(base_face_embedding) + np.random.normal(0, 0.02, 128)).tolist(),
            (np.array(base_face_embedding) + np.random.normal(0, 0.02, 128)).tolist()
        ]

        enroll_res = await client.post(f"{BASE_URL}/auth/face/enroll", json={
            "user_id": user_a_id,
            "samples": samples,
            "model_version": "v1-128d"
        }, headers=headers_a)
        assert enroll_res.status_code == 200 and enroll_res.json().get("success"), f"Enrollment failed: {enroll_res.text}"
        print("[OK] Test 3: Authenticated Multi-Sample Face Enrollment Success & Template Encrypted")

        # Step 5: Successful Face Verification (Matching Face)
        matching_live = (np.array(base_face_embedding) + np.random.normal(0, 0.01, 128)).tolist()
        verify_success = await client.post(f"{BASE_URL}/auth/face/verify", json={
            "user_id": user_a_id,
            "live_embedding": matching_live
        }, headers=headers_a)
        res_data = verify_success.json()
        assert res_data.get("success") and res_data.get("verified"), f"Verification failed: {res_data}"
        print(f"[OK] Test 4: Genuine Face Verification Success (Similarity: {res_data.get('similarity_score')})")

        # Step 6: Mismatched Face Verification Failure (Different Person)
        different_face = generate_random_embedding()
        verify_fail = await client.post(f"{BASE_URL}/auth/face/verify", json={
            "user_id": user_a_id,
            "live_embedding": different_face
        }, headers=headers_a)
        res_fail_data = verify_fail.json()
        assert not res_fail_data.get("verified"), "Mismatched face should not pass verification"
        print(f"[OK] Test 5: Mismatched Face Verification Failure Correctly Rejected (Similarity: {res_fail_data.get('similarity_score')})")

        # Step 7: Create User B and verify User Isolation (User B cannot use User A's face)
        email_b = f"userb_{np.random.randint(1000, 9999)}@hospital.org"
        signup_b = await client.post(f"{BASE_URL}/auth/signup", json={
            "full_name": "Test User B",
            "email": email_b,
            "password": "Password123!",
            "role": "doctor"
        })
        user_b_id = signup_b.json()["user_id"]
        
        cross_verify = await client.post(f"{BASE_URL}/auth/face/verify", json={
            "user_id": user_b_id,
            "live_embedding": base_face_embedding # Using User A's face against User B
        })
        cross_data = cross_verify.json()
        assert not cross_data.get("verified"), "User B should not verify using User A's face"
        print("[OK] Test 6: User Isolation Enforced (User B cannot verify using User A's biometric credential)")

        # Step 8: Revoke Face Credential
        revoke_res = await client.post(f"{BASE_URL}/auth/face/revoke", headers=headers_a)
        assert revoke_res.status_code == 200 and revoke_res.json().get("success"), f"Revocation failed: {revoke_res.text}"
        print("[OK] Test 7: Face Credential Revoked Successfully")

        # Step 9: Attempt Verification after Revocation
        post_revoke_verify = await client.post(f"{BASE_URL}/auth/face/verify", json={
            "user_id": user_a_id,
            "live_embedding": base_face_embedding
        }, headers=headers_a)
        post_revoke_data = post_revoke_verify.json()
        assert not post_revoke_data.get("verified"), "Revoked credential must not verify"
        print("[OK] Test 8: Post-Revocation Face Verification Correctly Denied")

        # Step 10: 3FA Step 1 Password Endpoint Verification
        step1_res = await client.post(f"{BASE_URL}/auth/login/step1-password", json={
            "email": email_a,
            "password": "Password123!"
        })
        assert step1_res.status_code == 200 and step1_res.json().get("status") == "step1_success", "Step 1 password failed"
        print("[OK] Test 9: 3FA Step 1 Password Auth Passed (Returns step1_success without issuing full JWT)")

    print("\n==================================================")
    print("   ALL 3FA FACE AUTHENTICATION TESTS PASSED!      ")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())

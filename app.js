import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDywAKfnmV6gnXyCsF1mjrE5THdV7l8O_M",
    authDomain: "library-c5b1f.firebaseapp.com",
    projectId: "library-c5b1f",
    storageBucket: "library-c5b1f.firebasestorage.app",
    messagingSenderId: "301737185007",
    appId: "1:301737185007:web:3806e6949d24817a16d51a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 1. AUTH STATE CHECK
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    const d = await getDoc(doc(db, "users", user.uid));
    const role = d.data()?.role || 'student';
    if(role === 'admin' || role === 'librarian') {
        document.getElementById('librarian-view').classList.remove('hidden');
    }
    loadMyBooks(user.email);
});

// 2. SECURE STUDENT REGISTRATION
document.getElementById('reg-btn').onclick = async () => {
    const email = document.getElementById('reg-email').value;
    const pin = document.getElementById('reg-pin').value;
    const name = document.getElementById('reg-user').value;
    const tutor = document.getElementById('reg-tutor').value;

    if (pin.length < 6) return alert("PIN must be 6 digits.");

    try {
        const secApp = initializeApp(firebaseConfig, "Secondary");
        const secAuth = getAuth(secApp);
        const res = await createUserWithEmailAndPassword(secAuth, email, pin);
        await setDoc(doc(db, "users", res.user.uid), { email, username: name, tutorGroup: tutor, role: "student" });
        await signOut(secAuth);
        alert("Student Registered Successfully!");
    } catch (e) { alert(e.message); }
};

// 3. BARCODE SCANNER
document.getElementById('start-scan').onclick = () => {
    const con = document.getElementById('scanner-container');
    con.classList.remove('hidden');
    Quagga.init({ inputStream: { type: "LiveStream", target: con, constraints: { facingMode: "environment" } }, decoder: { readers: ["ean_reader"] } }, (err) => { 
        if (err) return alert(err); 
        Quagga.start(); 
    });
    Quagga.onDetected((data) => {
        document.getElementById('l-isbn').value = data.codeResult.code;
        Quagga.stop();
        con.classList.add('hidden');
    });
};

// 4. SECURE BORROWING (WITH BLOCKING)
document.getElementById('loan-btn').onclick = async () => {
    const isbn = document.getElementById('l-isbn').value;
    const email = document.getElementById('l-email').value;
    const pin = document.getElementById('l-pin').value;

    try {
        // Check for active loans
        const q = query(collection(db, "borrowings"), where("studentEmail", "==", email), where("returned", "==", false));
        const snap = await getDocs(q);
        if (!snap.empty) return alert("⛔ Student already has an active loan.");

        // Verify Student PIN via Secondary Auth
        const verApp = initializeApp(firebaseConfig, "Verify");
        const verAuth = getAuth(verApp);
        await signInWithEmailAndPassword(verAuth, email, pin);
        
        // Record loan
        await addDoc(collection(db, "borrowings"), {
            isbn, studentEmail: email, borrowedAt: Date.now(),
            dueDate: Date.now() + (14 * 86400000), returned: false
        });

        await signOut(verAuth);
        alert("✅ Loan Successful!");
    } catch (e) { alert("Invalid PIN or Email."); }
};

// 5. VIEW MY BOOKS
function loadMyBooks(email) {
    const q = query(collection(db, "borrowings"), where("studentEmail", "==", email), where("returned", "==", false));
    onSnapshot(q, s => {
        const list = document.getElementById('book-list');
        list.innerHTML = s.empty ? "No current loans." : "";
        s.forEach(d => {
            const b = d.data();
            const days = Math.ceil((b.dueDate - Date.now()) / 86400000);
            list.innerHTML += `<div class="card"><strong>ISBN: ${b.isbn}</strong><br>Due in ${days} days</div>`;
        });
    });
}

document.getElementById('forgot-pin-btn').onclick = () => {
    const email = document.getElementById('l-email').value;
    if(email) sendPasswordResetEmail(auth, email).then(() => alert("Reset sent!"));
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

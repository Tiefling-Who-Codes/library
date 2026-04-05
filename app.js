import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, onSnapshot, query, where, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// AUTH STATE
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    const d = await getDoc(doc(db, "users", user.uid));
    const role = d.data()?.role || 'student';
    if(role === 'admin' || role === 'librarian') {
        document.getElementById('librarian-view').classList.remove('hidden');
    }
    loadMyBooks(user.email);
});

// SCANNER
document.getElementById('start-scan').onclick = () => {
    const con = document.getElementById('scanner-container');
    con.classList.remove('hidden');
    Quagga.init({
        inputStream: { type: "LiveStream", target: con, constraints: { facingMode: "environment" } },
        decoder: { readers: ["ean_reader"] }
    }, (err) => { if (err) return alert(err); Quagga.start(); });
    
    Quagga.onDetected((data) => {
        document.getElementById('isbn-input').value = data.codeResult.code;
        Quagga.stop();
        con.classList.add('hidden');
        document.getElementById('fetch-btn').click();
    });
};

// FETCH BOOK DATA
let tempBook = null;
document.getElementById('fetch-btn').onclick = async () => {
    const isbn = document.getElementById('isbn-input').value;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const data = await res.json();
    if (data.items) {
        const info = data.items[0].volumeInfo;
        tempBook = { isbn, title: info.title, cover: info.imageLinks?.thumbnail || '' };
        document.getElementById('preview').classList.remove('hidden');
        document.getElementById('p-title').innerText = tempBook.title;
        document.getElementById('p-img').src = tempBook.cover;
    } else { alert("Book not found."); }
};

document.getElementById('add-final').onclick = async () => {
    await setDoc(doc(db, "books", tempBook.isbn), tempBook);
    alert("Added to Catalog!");
    document.getElementById('preview').classList.add('hidden');
};

// LOAN LOGIC
document.getElementById('loan-btn').onclick = async () => {
    const isbn = document.getElementById('l-isbn').value;
    const email = document.getElementById('l-email').value;
    if(!isbn || !email) return alert("Fill all fields");
    await addDoc(collection(db, "borrowings"), {
        isbn, studentEmail: email, dueDate: Date.now() + (14 * 86400000)
    });
    alert("Loan Issued!");
};

function loadMyBooks(email) {
    const q = query(collection(db, "borrowings"), where("studentEmail", "==", email));
    onSnapshot(q, s => {
        const list = document.getElementById('book-list');
        list.innerHTML = s.empty ? "<p>No active loans.</p>" : "";
        s.forEach(d => {
            const b = d.data();
            const diff = Math.ceil((b.dueDate - Date.now())/86400000);
            list.innerHTML += `<div class="card"><strong>ISBN: ${b.isbn}</strong><br>Due in ${diff} days</div>`;
        });
    });
}

document.getElementById('logout-btn').onclick = () => signOut(auth);
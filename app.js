import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.data();
    
    document.getElementById('user-info').innerText = `${user.email} (${data.role})`;
    
    if(data.role === 'admin') {
        document.getElementById('admin-view').classList.remove('hidden');
        document.getElementById('librarian-view').classList.remove('hidden');
        loadUsers();
    } else if (data.role === 'librarian') {
        document.getElementById('librarian-view').classList.remove('hidden');
    }
});

function loadUsers() {
    onSnapshot(collection(db, "users"), snap => {
        const list = document.getElementById('user-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const u = d.data();
            list.innerHTML += `<tr><td>${u.email}</td><td>${u.role}</td>
            <td><button style="width:auto" onclick="window.promote('${d.id}')">Promote</button></td></tr>`;
        });
    });
}

window.promote = (id) => updateDoc(doc(db, "users", id), { role: 'librarian' });

document.getElementById('logout-btn').onclick = () => signOut(auth);
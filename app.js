// Import Firebase SDK (przez CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { notifyDateChanged } from './push.js';

// Konfiguracja Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDmkKCkLAvQNKEGuvcGfSnUjlSo3iDKe_w",
    authDomain: "zailerafal.firebaseapp.com",
    databaseURL: "https://zailerafal-default-rtdb.firebaseio.com",
    projectId: "zailerafal",
    storageBucket: "zailerafal.appspot.com",
    messagingSenderId: "995010930486",
    appId: "1:995010930486:web:ea6a93a2a33bb8593ef597"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Definicja zmiennych globalnych
let interval;
let isGifSet = false;

// Funkcja zapisująca datę do Firebase
function saveDate(date) {
    const dateRef = ref(db, "meetingDate/date");
    set(dateRef, date)
        .then(() => {
            console.log("[LOG] Data zapisana pomyślnie:", date);
        })
        .catch((error) => {
            console.error("[LOG] Błąd zapisu danych:", error);
        });
}

// Funkcja pobierająca datę z Firebase i uruchamiająca odliczanie
function getDate() {
    const dateRef = ref(db, "meetingDate/date");
    isGifSet = false;
    get(dateRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const savedDate = snapshot.val();
                console.log("[LOG] Pobrana data:", savedDate);
                document.getElementById("meeting-time").value = savedDate;
                startCountdown(savedDate);
            } else {
                console.log("[LOG] Brak zapisanej daty.");
            }
        })
        .catch((error) => {
            console.error("Błąd pobierania daty:", error);
        });
}

function setMeetingDate() {
    const dateInput = document.getElementById("meeting-time").value;

    if (dateInput) {
        const modal = document.getElementById("custom-alert");
        modal.classList.remove("hidden");

        document.getElementById("confirm-no").onclick = async () => {
            modal.classList.add("hidden");
            saveDate(dateInput);
            
            try {
                await notifyDateChanged(new Date(dateInput).toISOString());
                console.log("[LOG] Broadcast push wysłany");
            } catch (e) {
                console.error("[LOG] Błąd wysyłki broadcastu:", e);
            }

            console.log("[LOG] Użytkownik wybrał: Tak, potwierdzam");
            console.log("[LOG] Data została zapisana:", dateInput);
            clearInterval(interval);
            isGifSet = true;
            getDate();
        };

        document.getElementById("confirm-yes").onclick = () => {
            modal.classList.add("hidden");
            console.log("[LOG] Użytkownik wybrał: Nie, już zmieniam datę");
        };
    } else {
        alert("Proszę podać datę!");
    }
}

// Funkcja obsługująca odliczanie
function startCountdown(date) {
    const meetingDate = new Date(date);
    const countdownElement = document.getElementById("countdown");
    const gifElement = document.getElementById("gif");

    console.log('[LOG] Elementy do odliczania:', countdownElement, gifElement);

    function updateCountdown() {
        const now = new Date();
        const timeDifference = meetingDate - now;

        if (timeDifference <= 0) {
            countdownElement.textContent = "Spotkanie z Rafałem już trwa!";

            gifElement.src = "/gifs/gif2.gif"; 
            gifElement.alt = "Spotkanie trwa";

            console.log('[LOG] Odliczanie zatrzymane');
            clearInterval(interval); 
            return;
        } else {

            if (!isGifSet) {
                gifElement.src = "/gifs/gif1.gif";
                gifElement.alt = "Oczekiwanie na spotkanie";
                isGifSet = true;
            }
        }

        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        countdownElement.textContent =
            `Do spotkania z Rafałem pozostało: ${days} dni, ${hours} godzin, ${minutes} minut, ${seconds} sekund`;
    }

    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
    console.log('[LOG] Odliczania uruchomione:', interval);
}

// Udostępnienie funkcji w globalnym zakresie
window.setMeetingDate = setMeetingDate;

// Pobierz datę z Firebase, kiedy strona się ładuje
document.addEventListener("DOMContentLoaded", getDate);

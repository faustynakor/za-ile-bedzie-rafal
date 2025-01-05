// Import Firebase SDK (przez CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

// Funkcja zapisująca datę do Firebase
function saveDate(date) {
    const dateRef = ref(db, "meetingDate/date");
    set(dateRef, date)
        .then(() => {
            console.log("Data zapisana pomyślnie:", date);
        })
        .catch((error) => {
            console.error("Błąd zapisu danych:", error);
        });
}

// Funkcja pobierająca datę z Firebase i uruchamiająca odliczanie
function getDate() {
    const dateRef = ref(db, "meetingDate/date");
    get(dateRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const savedDate = snapshot.val();
                console.log("Pobrana data:", savedDate);
                document.getElementById("meeting-time").value = savedDate;
                startCountdown(savedDate);
            } else {
                console.log("Brak zapisanej daty.");
            }
        })
        .catch((error) => {
            console.error("Błąd pobierania daty:", error);
        });
}

// Funkcja ustawiająca datę i zapisująca ją w Firebase
function setMeetingDate() {
    const dateInput = document.getElementById("meeting-time").value;
    if (dateInput) {
        saveDate(dateInput);
        alert("Data spotkania została zapisana!");
        getDate();
    } else {
        alert("Proszę podać datę!");
    }
}

// Funkcja obsługująca odliczanie
function startCountdown(date) {
    const meetingDate = new Date(date);
    const countdownElement = document.getElementById("countdown");
    const gifElement = document.getElementById("gif");
    const update = 0

    function updateCountdown() {
        const now = new Date();
        const timeDifference = meetingDate - now;
        console.log("timeDifference:", timeDifference);

        update = update +1
    
        if (timeDifference <= 0) {
            countdownElement.textContent = "Spotkanie z Rafałem już trwa!";
            gifElement.src = "gifs/gif2.gif"; // GIF na czas spotkania
            gifElement.alt = "Spotkanie trwa";
            clearInterval(interval);
            return;
        } else {
            if (update < 1) {
                gifElement.src = "gifs/gif1.gif"; // GIF oczekiwania
                gifElement.alt = "Oczekiwanie na spotkanie";
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
    const interval = setInterval(updateCountdown, 1000);
}

// Udostępnienie funkcji w globalnym zakresie
window.setMeetingDate = setMeetingDate;

// Pobierz datę z Firebase, kiedy strona się ładuje
document.addEventListener("DOMContentLoaded", getDate);

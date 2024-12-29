// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDmkKCkLAvQNKEGuvcGfSnUjlSo3iDKe_w",
    authDomain: "zailerafal.firebaseapp.com",
    databaseURL: "https://zailerafal-default-rtdb.firebaseio.com",
    projectId: "zailerafal",
    storageBucket: "zailerafal.firebasestorage.app",
    messagingSenderId: "995010930486",
    appId: "1:995010930486:web:ea6a93a2a33bb8593ef597"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log("Firebase zainicjalizowany:", app);
console.log("Połączenie z bazą danych:", db);

function startCountdown(date) {
    const meetingTime = date;
    if (!meetingTime) {
        alert("Wprowadź datę i godzinę spotkania!");
        return;
    }

    const meetingDate = new Date(meetingTime);
    const countdownElement = document.getElementById("countdown");
    if (!countdownElement) {
        console.error("Element #countdown nie został znaleziony w DOM!");
        return;
    }

    function updateCountdown() {
        const now = new Date();
        const timeDifference = meetingDate - now;

        if (timeDifference <= 0) {
            countdownElement.textContent = "Spotkanie z Rafałem już trwa!";
            clearInterval(interval);
            return;
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

function saveDate(date) {
    if (!date || isNaN(new Date(date).getTime())) {
        console.error("Nieprawidłowa data:", date);
        return;
    }
    const dateRef = ref(db, "meetingDate/date");
    console.log(`Zapisuję datę "${date}" do ścieżki meetingDate/date`);
    set(dateRef, date)
        .then(() => {
            console.log("Data zapisana pomyślnie!");
        })
        .catch((error) => {
            console.error("Błąd zapisu danych:", error);
        });
}

function getDate() {
    const dateRef = ref(db, "meetingDate/date");
    get(dateRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const savedDate = snapshot.val();
                console.log("Zapisana data: ", savedDate);
                const inputElement = document.getElementById("meeting-time");
                if (inputElement) {
                    inputElement.value = savedDate;
                }
                startCountdown(savedDate);
            } else {
                console.log("Brak zapisanej daty.");
            }
        })
        .catch((error) => {
            console.error("Błąd pobierania daty:", error);
        });
}

function setMeetingDate() {
    const dateInput = document.getElementById("meeting-time").value;
    if (dateInput) {
        saveDate(dateInput);
        alert("Data spotkania została zapisana!");
        getDate(); // Pobierz zapisane dane i rozpocznij odliczanie
    } else {
        alert("Proszę podać datę!");
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(() => {
            console.log("Service Worker zarejestrowany!");
        })
        .catch((error) => {
            console.error("Błąd rejestracji Service Workera: ", error);
        });
} else {
    console.log("Service Worker nie jest wspierany przez tę przeglądarkę.");
}

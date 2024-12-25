function startCountdown() {
    const meetingTime = document.getElementById("meeting-time").value;
    if (!meetingTime) {
        alert("Wprowadź datę i godzinę spotkania!");
        return;
    }

    const meetingDate = new Date(meetingTime);
    const countdownElement = document.getElementById("countdown");

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

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(() => {
        console.log("Service Worker zarejestrowany!");
    });
}

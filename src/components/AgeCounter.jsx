import { useState, useEffect } from "react";

const AgeCounter = ({ birthday, decimals }) => {
    const [time, setTime] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const birthdate = new Date(birthday);
            const diff = now - birthdate;
            const age = diff / 1000 / 60 / 60 / 24 / 365.25;
            setTime(age);
        }, 50);

        return () => clearInterval(interval);
    }, [birthday]);

    return <span class="font-bold">{time.toFixed(decimals)}</span>;
};

export default AgeCounter;

const Footer = (state, actions) => {
  // Function to load a random mushroom blurb, joke, or fact
  const loadRandomMushroomInfo = () => {
  const peaceAndZenQuotes = [
  "Peace comes from within. Do not seek it without. – Buddha",
  "To conquer oneself is a greater victory than to conquer thousands in a battle. – Dalai Lama",
  "The only true wisdom is in knowing you know nothing. – Socrates",
  "Happiness is not something ready-made. It comes from your own actions. – Dalai Lama",
  "The best way to find yourself is to lose yourself in the service of others. – Mahatma Gandhi",
  "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment. – Buddha",
  "In the middle of difficulty lies opportunity. – Albert Einstein",
  "He who conquers himself is the mightiest warrior. – Confucius",
  "Act without expectation. – Lao Tzu",
  "The only way to bring peace to the earth is to learn to make our own life peaceful. – Buddha",
  "Kindness should become the natural way of life, not the exception. – Buddha",
  "A man is but the product of his thoughts. What he thinks, he becomes. – Mahatma Gandhi",
  "Everything has beauty, but not everyone sees it. – Confucius",
  "To understand everything is to forgive everything. – Buddha",
  "Change your thoughts and you change your world. – Norman Vincent Peale",
  "The journey of a thousand miles begins with one step. – Lao Tzu",
  "Our prime purpose in this life is to help others. And if you can't help them, at least don't hurt them. – Dalai Lama",
  "Life is really simple, but we insist on making it complicated. – Confucius",
  "The mind is everything. What you think you become. – Buddha",
  "Peace begins with a smile. – Mother Teresa",
  "Be kind, for everyone you meet is fighting a hard battle. – Philo",
  "The best revenge is to be unlike him who performed the injustice. – Marcus Aurelius",
  "He who is contented is rich. – Lao Tzu",
  "The greatest glory in living lies not in never falling, but in rising every time we fall. – Nelson Mandela",
  "Success is not final, failure is not fatal: It is the courage to continue that counts. – Winston S. Churchill",
  "Patience is not the ability to wait, but the ability to keep a good attitude while waiting. – Joyce Meyer",
  "The weak can never forgive. Forgiveness is the attribute of the strong. – Mahatma Gandhi",
  "It does not matter how slowly you go as long as you do not stop. – Confucius",
  "Humility is not thinking less of yourself, it's thinking of yourself less. – C.S. Lewis",
  "Adopt the pace of nature: her secret is patience. – Ralph Waldo Emerson",
  "With the new day comes new strength and new thoughts. – Eleanor Roosevelt",
  "Fall seven times, stand up eight. – Japanese Proverb",
  "Strength does not come from physical capacity. It comes from an indomitable will. – Mahatma Gandhi",
  "What lies behind us and what lies before us are tiny matters compared to what lies within us. – Ralph Waldo Emerson",
  "The only limit to our realization of tomorrow will be our doubts of today. – Franklin D. Roosevelt",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "No act of kindness, no matter how small, is ever wasted. – Aesop",
  "In the midst of chaos, there is also opportunity. – Sun Tzu",
  "Do what you feel in your heart to be right – for you’ll be criticized anyway. – Eleanor Roosevelt",
  "The greatest weapon against stress is our ability to choose one thought over another. – William James"
];

    // Randomly select one piece of information
    return peaceAndZenQuotes[Math.floor(Math.random() * peaceAndZenQuotes.length)];
  };

  // Get a random mushroom info for the current render
  const randomMushroomInfo = loadRandomMushroomInfo();

  return hyperapp.h("footer", { class: "footer mt-auto py-3 bg-light" }, [
    hyperapp.h("div", { class: "container" }, [
      hyperapp.h("div", { class: "d-flex justify-content-between" }, [
        // Left side: copyright, project name, and social links inline
        hyperapp.h("div", { class: "d-flex align-items-center" }, [
          hyperapp.h(
            "span",
            { class: "text-muted" },
            "© 2018 Joshua Wiedeman"
          ),
          hyperapp.h(
            "a",
            {
              href: "https://github.com/jwiedeman",
              class: "text-muted me-2 ms-2",
            },
            "GitHub"
          ),
      
        ]),
        // Right side: random mushroom blurb, joke, or fact
        hyperapp.h("div", {}, [
          hyperapp.h("span", { class: "text-muted" }, randomMushroomInfo),
        ]),
      ]),
    ]),
  ]);
};

export default Footer;

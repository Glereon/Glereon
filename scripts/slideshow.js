 // Slide index counter - starts at 0
        let slideIndex = 0;
        
        // Get all slide images
        const slides = document.querySelectorAll('.img');
        
        // Function to show next slide
        function showSlide() {
            // Hide all slides by removing active class
            slides.forEach(slide => slide.classList.remove('active'));
            
            // Show current slide by adding active class
            slides[slideIndex].classList.add('active');
            
            // Increment slide index
            slideIndex++;
            
            // Reset to first slide when reaching the end
            if (slideIndex >= slides.length) {
                slideIndex = 0;
            }
        }
        
        // Change slide every 4 seconds (4000 milliseconds)
        setInterval(showSlide, 4000);
        
        // Preload images for smoother transitions
        const images = [
            'logos/handwash1.jpeg',
            'logos/handwash2.jpg',
            'logos/handwash3.jpeg',
            'logos/handwash4.jpg'
        ];
        
        // Preload each image to prevent loading delays
        images.forEach(src => {
            const img = new Image();
            img.src = src;
        });
gsap.registerPlugin(ScrollTrigger);

// 1. Cinematic Zoom & Pan only for the PC Background Image
// We use matchMedia so it only runs on desktop/tablet, avoiding errors on mobile where it's hidden
let mm = gsap.matchMedia();

mm.add("(min-width: 769px)", () => {
    gsap.to("#bg-image-pc", {
        scale: 1.2,      
        yPercent: 10,    
        ease: "none",
        scrollTrigger: {
            trigger: "#content",
            start: "top top",
            end: "bottom bottom", 
            scrub: 1.5 
        }
    });
});

// Cinematic Zoom & Pan for the Mobile Background Image
mm.add("(max-width: 768px)", () => {
    gsap.to("#bg-image-mobile", {
        scale: 1.1,      
        yPercent: 5,    
        ease: "none",
        scrollTrigger: {
            trigger: "#content",
            start: "top top",
            end: "bottom bottom", 
            scrub: 1.5 
        }
    });
});

// 2. Fade up animations for texts and boxes in each section (All Devices)
gsap.utils.toArray('.step').forEach(step => {
    const elements = step.querySelectorAll('h1, p.desc, .luxury-details, .box, .package-card, button, .booking-form');
    
    gsap.to(elements, {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.15, 
        ease: "power3.out",
        scrollTrigger: {
            trigger: step,
            start: "top 75%", 
            end: "bottom 25%", // Trigger reverse a bit later to avoid flashing
            scrub: false,
            toggleActions: "play reverse play reverse"
        }
    });
});

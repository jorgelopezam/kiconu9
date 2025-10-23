"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { VideoCard } from "@/components/panel/VideoCard";
import { ProgressCard } from "@/components/panel/ProgressCard";

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  imageUrl: string;
  isCompleted: boolean;
}

export default function Phase1Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Mock video data - in production, this would come from Firestore
  const [videos] = useState<Video[]>([
    {
      id: "1",
      title: "Introduction to Mindful Eating",
      description: "Discover the foundational principles of mindful eating.",
      duration: "10:00",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA4BN3XKQAv4z29K1fDub9JZcYfoHG8SZOLX0pN_VEsWM2YkpZ_VHVW0ndLJLw4ktEBxP7zaOyAK6xxj6YCePrfr5OJlOiV1hRmXfkZUuHVNTE8zeHjrz7_jHxJ8QdRINzrtm1N2tqpjfpu3BhDbYroTNbAWZE25bv7B8Mw-SraUQdYa4EHfhcNiaAU8MovL_WeyCr-oHNZe_c4MmB1fMIkwBIDVPnLnhnbgt9lFD6UUuzV5bJ_0M133rxZlg8PDr4yODNu9cWzg",
      isCompleted: false,
    },
    {
      id: "2",
      title: "Understanding Your Hunger Cues",
      description: "Learn to listen to your body's natural signals.",
      duration: "15:30",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCgF25H6Tb7K6tXGG8xmpTeSzxYtyPLdiBPILLsKifjisXdxJz0eRb8TEpsJAh5QPtNjGR6dmQmNyRHOBHi3rbLYuDivaZDPAdgrKMLoa9dLyblKHG1hS_QLoupK0LVHv-DWMVh3ZhQV2BWyqp-OheUMXAwzSNgj5JC3Txm9cA3kRzVYbbo41bSNPIgiOy0XikrdF72oFGe43Qmb2GPog8Fs6oMZReAI8VxDp0RWB_mXGUYISxhDEwlunx9U86SDioPlrXmxdJmMA",
      isCompleted: false,
    },
    {
      id: "3",
      title: "The Gut-Brain Connection",
      description: "Explore the link between your digestive system and brain.",
      duration: "12:15",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBhdkuWC3qY1QpPY-Cc0shsOEfiuO9xlJYbxlj4vVS1hGsSUWOkEe_QDbKBySG3lxAQX1Qcipl_keLoCsx-2-jRRJo5h6A3yLa4KqWZ4Z2nwHlMNI-j6M_djOixaJ8sCWmTF0FgKez8dG8x1m_A5PRhtdQYZBYRt4xQ1xdmNe2rcT2p6HRreFvmdtomR5cm3eqZVfeL2oa3ZYWS3NYhi_aDX_JWozNn33_OCiHKhSSoui8V-41mLQMm8nmyhxdc0nslhnUqC-w9wg",
      isCompleted: true,
    },
    {
      id: "4",
      title: "Nourishing Your Body with Whole Foods",
      description: "Understand the benefits of a whole-foods-based diet.",
      duration: "20:00",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCnLdgTvDcBkEL3LbgaoUlBzn8Xpmosl0jx-y8PKFTkhHc18uNxWESgc_ydleHzLDzxJUK7leL2yfXDopoVFNmOTYNcMIEBjEUQ-j-YZfuYMPijDZGEs3_WKvN1lTG1Ue3qBNlUMi3o-HT3Bg_Suu4-Etk3tBw-aPysCD5RPoK-C2fl154w1fPjS_vKcaLGXMBakSz1WxE1KkJzFK3rb-_FKhtHGChxrXUfyfRTEXiHMVcGop2iq_kev5McS2J1N2n3niGeFTR-0A",
      isCompleted: false,
    },
    {
      id: "5",
      title: "Mindful Kitchen, Mindful Life",
      description: "Transform your kitchen into a sanctuary for mindful cooking.",
      duration: "18:45",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGnBDgGXED2-2ZilmHZP9UNsiI4XiU_g0ofJ-0EZw60IjiaDPjCbQQwPd5rJ3iOcxyUjLxYkRPqzong2bY7nzpq0be9EAv1r26rRrsEb4_T_8g5oBYvLuk4hbovv4qTlv_Wlc1q-SL2j59lYxlD5FsyCTrFy_yM7NEoBTwZSiOAgC7OYT9XSjMSeoye1H3ESNn1kEIyPPAxPFc1xHmM2lFCZoAAgkoYs1gSQj4M_rCLXUoisFEex0Jb3uvfGCgeMQeXCGNRui_Zw",
      isCompleted: false,
    },
    {
      id: "6",
      title: "Eating with Awareness",
      description: "Techniques to stay present and engaged during your meals.",
      duration: "14:20",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLgPMGiVBBBIkifpNKSpBZA6PxmW1n1yBprf7ThpOqSOi5C3yXkhcrKl3Mq8kOyxZPNpRYe0SoxVu9MIU5vic_uzCkbg9o54lELyBPWCIDxnpFi_-41sRO_CvfEg8tnewY6-MkGRekQ6U1kMQJMdhRw2aUGQF5xCEZDvg7gGlrLDflzorxJxmVqMHjoM4qe4-0A5ABCxJzTdVOkGbOS_LxBUOakve8hom9n_KxkzWJJi1isrV1Cj4tmrH305MCqDh9WcDTacQIhQ",
      isCompleted: false,
    },
    {
      id: "7",
      title: "The Power of Hydration",
      description: "Learn the importance of water and how to stay properly hydrated.",
      duration: "8:00",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZ3Q_eNEkJ7XXGp2LLf10K9_6EVOelQWYJx0iNFmdgWqt9rTqsuyry2qgSvk_vUI5tb8BBHyO6uU1F8qFgjoAB7FK8mKrJ3UpYwb34UQ4Q790hvaarQJzu4vJrH4fkCqLfAqebVgYIDmUgUu2-GZQ4wjWI1wvpaQuPfqesENfv2FsmIOQ1bT2D1xgjEv-tus_-tZqKKInZ99GuJaQY7gmMaZRwBIwjW2jpLOho-OZvZDRwm2elejfIyAIauoGvkpC1ABVLtUWcvw",
      isCompleted: true,
    },
    {
      id: "8",
      title: "Emotional Eating vs. Physical Hunger",
      description: "Differentiate between eating for emotional comfort and physical need.",
      duration: "16:30",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhBBN8am6tGq9rWHWZseXKeUJVF2KzcgxnYYi_puWowM0bRaurUslBNj9ypHiE4taFjoxcyOSMedR8X-4wJdzL6jbbOlF2aB0MEUcBzml2TXSFVPex6Rj8lVjovx3EgeH-Q1kx1OS7SKVz32M27uZDW9mAtS3msPYTjxyBC3t5mev6So0kUJVKjaVxlgpg7z58TgReX4vdvw84tzDXEe4ZM_KMx2ZI9WLfDvz4klc9JCrJP692YsLM5sbG3-myAJYGNcmP8cZDqg",
      isCompleted: false,
    },
    {
      id: "9",
      title: "The Art of Plating",
      description: "Learn how to create visually appealing meals to enhance your dining experience.",
      duration: "11:10",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBRO08oLpELFSJalUjgb_h6WsT237TzrwRPgr32G_Kypgt2CmOONV0QMTDLaxqyXgqwyVu0OnTuNMSuIW7_AnCdSudLlEvgUXBO4DZQKJnXbKW8ARkrqOyQnKf4TgSCR7J5jE35-VUkITWNFdoTFQt56beZYlQPWkCVZSKBj403GODRqN2542jOtLADGQl4gQj1vNI2bnVVQbjvbQVHnhKkwU2Q4bfezniNBcFg5iEuar-rpt0Gndd_hndJpbQNbIO_FdnSkK4AHg",
      isCompleted: false,
    },
    {
      id: "10",
      title: "Gratitude and Food",
      description: "Cultivate a practice of gratitude for the food you eat.",
      duration: "7:45",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKek1ycTvDvHn67cNo9XYRQ5wR0S-aIAp5a9pRaKu44KMBAiWILF_L3vJjOO8PQqBYVFW2_HGNnBnLXzyeWPam9QcODFl4-VGHHZ4j9amnm1wKmKR7BdEgrLWUFfNbW9cJPiIPZeAmps9EWmcVGryvZlTPU9WcS_nSAIOXaFHOrdqtOnfNglxSelqjOj55AVFuc2mti-3MafzxRhOuqLZWvysQet3tMqTwQE1gFz-GAdXq8-sJkX3rayv1jgh-0KJfVthmPxGEYQ",
      isCompleted: true,
    },
    {
      id: "11",
      title: "Mindful Snacking",
      description: "Healthy and mindful snack ideas to keep you energized.",
      duration: "9:30",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnbwcony7pNlwtw4Ew7NmDuFrAaus4F_tuNOl_9gkPe9ttTwXiU0LBYhq_XbZUwTuxObAIErG-uICUGnDP8iFkzrjGDVgt021kBi9lEYIv_5Zd2lI65kNLEZiCWDZYfjuH0m96-mh9xJo1R6MXXJFPBrS3eLhpqza940SFroVqPt9aaCeuw6WmqBzuGPVouakbdd4kQMdwpPDr4B5PmEf0xVpX9VAkUVjOgUPnUMXZk3MiY6fvR_sv3SBuqjyscqrMi_MNtVpk1A",
      isCompleted: false,
    },
    {
      id: "12",
      title: "Navigating Social Eating",
      description: "Tips for enjoying social gatherings without compromising your practice.",
      duration: "13:00",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXnkA8o1gcqnXEfvf_zuIYUrQZhKQb35ErTnTWjs5hUESZrFiExA9_A-ZCGpVj5oWLGgCiAnBIy4JkgPTbEIjmwOfk4nwkGzD8sk9M6JGBsiA5e8WwzUuwooCHnkqW0SrpWTI1KQDURXsU8ztU0me7JtmSHkKbCmk9VmXWMaVnh6knlKORDUE2k1OPkkCmg6lYWIj5iuB-xgtDEcFIpXRwyIYQ0iMjobl65WfaUn3LMzEh3VX2YvMU4Xuhcu_9NyK5S-6KaAbkXA",
      isCompleted: false,
    },
    {
      id: "13",
      title: "Your Body's Wisdom",
      description: "Tune into your body's innate intelligence for nourishment.",
      duration: "17:20",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDajb8T3oK67J9i8GNwM_t2pF-ZyHIaHhkfvjj0560UTbMzyzMThr8WiwVpWjKHn3cIBmKQNxGY-6dJAmXDPZYowe9uVOhLbKc18NRH7R2EMnodxRGLxXbvxB_2et92ihtR7A8VfxeepUZgOvDu-eiAzMOQsGGIvB_IdvtM9coxv4KxQ85hdlso__QVD6LzZF-FT2fi0HRvMfaL2JF97-04JQ9Kz6JH4kUio1q2Bjt3_7_xCr_GtNXaSj1-73f9R5fKnpVOFYuB3g",
      isCompleted: false,
    },
    {
      id: "14",
      title: "Integrating Mindful Eating into Daily Life",
      description: "Practical strategies for making mindful eating a sustainable habit.",
      duration: "22:00",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBHarDyHGW036pUkQ-YM6oWhLGtT3WTPi1TdVBfJlguYehGRZH7V29TiidS2yVeogoa-lS1mVIcevsU3iPG9rfArTEQR2toPCnsAb75wZ2fW6tGk6E81GOE0h4f4xFKiBxEMv97bjvG6wWNlxxoJn5bXuRTTs7u9gxZiQX6KpEtV9OKg3CeAFQIKyxAMqxLtLv5ykTb5vgL3YeUDeAq4mL6KgT4Pe7SNHVGxc35htm8qNJVP8FB2jd-quCciHlbhGZrOk1DN8X8aQ",
      isCompleted: false,
    },
  ]);

  const completedCount = videos.filter((v) => v.isCompleted).length;
  const progress = Math.round((completedCount / videos.length) * 100);

  const handleVideoClick = (videoId: string) => {
    // TODO: Open video player modal
    console.log("Play video:", videoId);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-panel-text">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col gap-12">
          {/* Header */}
          <div className="flex flex-col gap-4 text-center">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-panel-text sm:text-5xl">
              Phase 1: Foundations of Mindful Eating
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-panel-muted">
              Begin your journey to a more connected and nourished self. These videos
              will guide you through the core principles of mindful nutrition.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mx-auto w-full max-w-2xl">
            <ProgressCard title="Phase 1 Progress" progress={progress} />
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                title={video.title}
                description={video.description}
                duration={video.duration}
                imageUrl={video.imageUrl}
                isCompleted={video.isCompleted}
                onClick={() => handleVideoClick(video.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

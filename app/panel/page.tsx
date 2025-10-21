"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NextActivityCard } from "@/components/panel/NextActivityCard";
import { QuickActionButton } from "@/components/panel/QuickActionButton";
import { PhaseTab } from "@/components/panel/PhaseTab";
import { VideoCard } from "@/components/panel/VideoCard";

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  imageUrl: string;
  isCompleted: boolean;
}

interface Phase {
  id: number;
  title: string;
  imageUrl: string;
  progress: number;
  videos: Video[];
}

export default function PanelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedPhase, setSelectedPhase] = useState(1);

  // Mock phase data with videos
  const phases: Phase[] = [
    {
      id: 1,
      title: "Fase 1: Reset Integral",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCgfOaQ7g0I96xmkbGtyG08buzx7ird0-EKBGBylXBqyblFqU_BwtCKa3mDkSAYNFEoaWJtHc1khnfXmDHE7_UmaVoNFi3Uz0NUDjJIDp5fzgLwxKY5l_5QX_8eei1QNDLIbcvUWRYcZv6b9g5ispzzRAyqRY34_yXj7CAHWJCqHPH-GH6GZcHprg0oZ9gIQ98wgJDLpeKXAunts9BeeMiGTUReEni-_F6MHzlAsYvqozUgQm49IQi8Z1zd0Hn2lqfSytoCFABwfQ",
      progress: 21,
      videos: [
        {
          id: "1-1",
          title: "Introduction to Mindful Eating",
          description: "Discover the foundational principles of mindful eating.",
          duration: "10:00",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA4BN3XKQAv4z29K1fDub9JZcYfoHG8SZOLX0pN_VEsWM2YkpZ_VHVW0ndLJLw4ktEBxP7zaOyAK6xxj6YCePrfr5OJlOiV1hRmXfkZUuHVNTE8zeHjrz7_jHxJ8QdRINzrtm1N2tqpjfpu3BhDbYroTNbAWZE25bv7B8Mw-SraUQdYa4EHfhcNiaAU8MovL_WeyCr-oHNZe_c4MmB1fMIkwBIDVPnLnhnbgt9lFD6UUuzV5bJ_0M133rxZlg8PDr4yODNu9cWzg",
          isCompleted: false,
        },
        {
          id: "1-2",
          title: "Understanding Your Hunger Cues",
          description: "Learn to listen to your body's natural signals.",
          duration: "15:30",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCgF25H6Tb7K6tXGG8xmpTeSzxYtyPLdiBPILLsKifjisXdxJz0eRb8TEpsJAh5QPtNjGR6dmQmNyRHOBHi3rbLYuDivaZDPAdgrKMLoa9dLyblKHG1hS_QLoupK0LVHv-DWMVh3ZhQV2BWyqp-OheUMXAwzSNgj5JC3Txm9cA3kRzVYbbo41bSNPIgiOy0XikrdF72oFGe43Qmb2GPog8Fs6oMZReAI8VxDp0RWB_mXGUYISxhDEwlunx9U86SDioPlrXmxdJmMA",
          isCompleted: false,
        },
        {
          id: "1-3",
          title: "The Gut-Brain Connection",
          description: "Explore the link between your digestive system and brain.",
          duration: "12:15",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBhdkuWC3qY1QpPY-Cc0shsOEfiuO9xlJYbxlj4vVS1hGsSUWOkEe_QDbKBySG3lxAQX1Qcipl_keLoCsx-2-jRRJo5h6A3yLa4KqWZ4Z2nwHlMNI-j6M_djOixaJ8sCWmTF0FgKez8dG8x1m_A5PRhtdQYZBYRt4xQ1xdmNe2rcT2p6HRreFvmdtomR5cm3eqZVfeL2oa3ZYWS3NYhi_aDX_JWozNn33_OCiHKhSSoui8V-41mLQMm8nmyhxdc0nslhnUqC-w9wg",
          isCompleted: true,
        },
        {
          id: "1-4",
          title: "Nourishing Your Body with Whole Foods",
          description: "Understand the benefits of a whole-foods-based diet.",
          duration: "20:00",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCnLdgTvDcBkEL3LbgaoUlBzn8Xpmosl0jx-y8PKFTkhHc18uNxWESgc_ydleHzLDzxJUK7leL2yfXDopoVFNmOTYNcMIEBjEUQ-j-YZfuYMPijDZGEs3_WKvN1lTG1Ue3qBNlUMi3o-HT3Bg_Suu4-Etk3tBw-aPysCD5RPoK-C2fl154w1fPjS_vKcaLGXMBakSz1WxE1KkJzFK3rb-_FKhtHGChxrXUfyfRTEXiHMVcGop2iq_kev5McS2J1N2n3niGeFTR-0A",
          isCompleted: false,
        },
        {
          id: "1-5",
          title: "The Power of Hydration",
          description: "Learn the importance of water and how to stay properly hydrated.",
          duration: "8:00",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZ3Q_eNEkJ7XXGp2LLf10K9_6EVOelQWYJx0iNFmdgWqt9rTqsuyry2qgSvk_vUI5tb8BBHyO6uU1F8qFgjoAB7FK8mKrJ3UpYwb34UQ4Q790hvaarQJzu4vJrH4fkCqLfAqebVgYIDmUgUu2-GZQ4wjWI1wvpaQuPfqesENfv2FsmIOQ1bT2D1xgjEv-tus_-tZqKKInZ99GuJaQY7gmMaZRwBIwjW2jpLOho-OZvZDRwm2elejfIyAIauoGvkpC1ABVLtUWcvw",
          isCompleted: true,
        },
        {
          id: "1-6",
          title: "Gratitude and Food",
          description: "Cultivate a practice of gratitude for the food you eat.",
          duration: "7:45",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKek1ycTvDvHn67cNo9XYRQ5wR0S-aIAp5a9pRaKu44KMBAiWILF_L3vJjOO8PQqBYVFW2_HGNnBnLXzyeWPam9QcODFl4-VGHHZ4j9amnm1wKmKR7BdEgrLWUFfNbW9cJPiIPZeAmps9EWmcVGryvZlTPU9WcS_nSAIOXaFHOrdqtOnfNglxSelqjOj55AVFuc2mti-3MafzxRhOuqLZWvysQet3tMqTwQE1gFz-GAdXq8-sJkX3rayv1jgh-0KJfVthmPxGEYQ",
          isCompleted: true,
        },
      ],
    },
    {
      id: 2,
      title: "Fase 2: Regenerativa",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrg3jTg70_rOhFdHViWf6kEwo8hDesi9hVlvAMy5_j6sWUXD3SkghbmTfjdRCwWIa20nPFZt1MFDzh0U4_Q7LryNE_nkUcd8ZbNAFtblZfT-qurxhFCW_-0WzTzkxvMRo0jUxBYZZ-C-vqpJSCIs1atsfBj4ffOgY-dhcBUPWg-qdrhTEJJJKPJRX48cIenGdu-5XaTzbj3grxojKWXD8dpgTI-forkGkPLLDNRRWifFqUfvMMcTg7qaZpUblMHA7lnrQsRNGxAg",
      progress: 45,
      videos: [
        {
          id: "2-1",
          title: "Breath Awareness Practice",
          description: "Connect with your breath before eating.",
          duration: "8:30",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrg3jTg70_rOhFdHViWf6kEwo8hDesi9hVlvAMy5_j6sWUXD3SkghbmTfjdRCwWIa20nPFZt1MFDzh0U4_Q7LryNE_nkUcd8ZbNAFtblZfT-qurxhFCW_-0WzTzkxvMRo0jUxBYZZ-C-vqpJSCIs1atsfBj4ffOgY-dhcBUPWg-qdrhTEJJJKPJRX48cIenGdu-5XaTzbj3grxojKWXD8dpgTI-forkGkPLLDNRRWifFqUfvMMcTg7qaZpUblMHA7lnrQsRNGxAg",
          isCompleted: true,
        },
        {
          id: "2-2",
          title: "The Five Senses Exercise",
          description: "Engage all your senses while eating.",
          duration: "14:20",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLgPMGiVBBBIkifpNKSpBZA6PxmW1n1yBprf7ThpOqSOi5C3yXkhcrKl3Mq8kOyxZPNpRYe0SoxVu9MIU5vic_uzCkbg9o54lELyBPWCIDxnpFi_-41sRO_CvfEg8tnewY6-MkGRekQ6U1kMQJMdhRw2aUGQF5xCEZDvg7gGlrLDflzorxJxmVqMHjoM4qe4-0A5ABCxJzTdVOkGbOS_LxBUOakve8hom9n_KxkzWJJi1isrV1Cj4tmrH305MCqDh9WcDTacQIhQ",
          isCompleted: true,
        },
        {
          id: "2-3",
          title: "Slow Eating Meditation",
          description: "Learn to eat slowly and mindfully.",
          duration: "16:45",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA4BN3XKQAv4z29K1fDub9JZcYfoHG8SZOLX0pN_VEsWM2YkpZ_VHVW0ndLJLw4ktEBxP7zaOyAK6xxj6YCePrfr5OJlOiV1hRmXfkZUuHVNTE8zeHjrz7_jHxJ8QdRINzrtm1N2tqpjfpu3BhDbYroTNbAWZE25bv7B8Mw-SraUQdYa4EHfhcNiaAU8MovL_WeyCr-oHNZe_c4MmB1fMIkwBIDVPnLnhnbgt9lFD6UUuzV5bJ_0M133rxZlg8PDr4yODNu9cWzg",
          isCompleted: true,
        },
        {
          id: "2-4",
          title: "Body Scan for Hunger",
          description: "Tune into physical sensations of hunger.",
          duration: "11:00",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCgF25H6Tb7K6tXGG8xmpTeSzxYtyPLdiBPILLsKifjisXdxJz0eRb8TEpsJAh5QPtNjGR6dmQmNyRHOBHi3rbLYuDivaZDPAdgrKMLoa9dLyblKHG1hS_QLoupK0LVHv-DWMVh3ZhQV2BWyqp-OheUMXAwzSNgj5JC3Txm9cA3kRzVYbbo41bSNPIgiOy0XikrdF72oFGe43Qmb2GPog8Fs6oMZReAI8VxDp0RWB_mXGUYISxhDEwlunx9U86SDioPlrXmxdJmMA",
          isCompleted: true,
        },
        {
          id: "2-5",
          title: "Mindful Portion Control",
          description: "Understanding appropriate serving sizes.",
          duration: "13:15",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCnLdgTvDcBkEL3LbgaoUlBzn8Xpmosl0jx-y8PKFTkhHc18uNxWESgc_ydleHzLDzxJUK7leL2yfXDopoVFNmOTYNcMIEBjEUQ-j-YZfuYMPijDZGEs3_WKvN1lTG1Ue3qBNlUMi3o-HT3Bg_Suu4-Etk3tBw-aPysCD5RPoK-C2fl154w1fPjS_vKcaLGXMBakSz1WxE1KkJzFK3rb-_FKhtHGChxrXUfyfRTEXiHMVcGop2iq_kev5McS2J1N2n3niGeFTR-0A",
          isCompleted: false,
        },
        {
          id: "2-6",
          title: "Emotional Awareness Journal",
          description: "Track emotions and eating patterns.",
          duration: "10:30",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBHarDyHGW036pUkQ-YM6oWhLGtT3WTPi1TdVBfJlguYehGRZH7V29TiidS2yVeogoa-lS1mVIcevsU3iPG9rfArTEQR2toPCnsAb75wZ2fW6tGk6E81GOE0h4f4xFKiBxEMv97bjvG6wWNlxxoJn5bXuRTTs7u9gxZiQX6KpEtV9OKg3CeAFQIKyxAMqxLtLv5ykTb5vgL3YeUDeAq4mL6KgT4Pe7SNHVGxc35htm8qNJVP8FB2jd-quCciHlbhGZrOk1DN8X8aQ",
          isCompleted: false,
        },
      ],
    },
    {
      id: 3,
      title: "Fase 3: Mi Nuevo Sentir",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCmV1mI9QLaTjZJMUfAt0durOXOyyoxW9CJgHa8bLSRdDbBvt3cfu72JATadatYf6FQAmNMJvwBCg2TF6N-HNFgE9zajFlaZ8SreBOT7KFyLoc-6HHmjp4meFSdK5VgCieFUVQIYTRWMlmjZjzEz2T6DhAYF-j3io6WPxqPpFUS-dnvTCwHDnv4oXOXzn0ceHGePRvpKoV8vOQtqZQnosCqnVp3U5aXDnJg_-3W38mBDOv4tm7p7MDPe03ktSUrNbL6e6HnBzRzsw",
      progress: 10,
      videos: [
        {
          id: "3-1",
          title: "Sacred Eating Rituals",
          description: "Create meaningful rituals around meals.",
          duration: "18:00",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCmV1mI9QLaTjZJMUfAt0durOXOyyoxW9CJgHa8bLSRdDbBvt3cfu72JATadatYf6FQAmNMJvwBCg2TF6N-HNFgE9zajFlaZ8SreBOT7KFyLoc-6HHmjp4meFSdK5VgCieFUVQIYTRWMlmjZjzEz2T6DhAYF-j3io6WPxqPpFUS-dnvTCwHDnv4oXOXzn0ceHGePRvpKoV8vOQtqZQnosCqnVp3U5aXDnJg_-3W38mBDOv4tm7p7MDPe03ktSUrNbL6e6HnBzRzsw",
          isCompleted: true,
        },
        {
          id: "3-2",
          title: "Connection to Food Sources",
          description: "Understanding where your food comes from.",
          duration: "22:30",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA4BN3XKQAv4z29K1fDub9JZcYfoHG8SZOLX0pN_VEsWM2YkpZ_VHVW0ndLJLw4ktEBxP7zaOyAK6xxj6YCePrfr5OJlOiV1hRmXfkZUuHVNTE8zeHjrz7_jHxJ8QdRINzrtm1N2tqpjfpu3BhDbYroTNbAWZE25bv7B8Mw-SraUQdYa4EHfhcNiaAU8MovL_WeyCr-oHNZe_c4MmB1fMIkwBIDVPnLnhnbgt9lFD6UUuzV5bJ_0M133rxZlg8PDr4yODNu9cWzg",
          isCompleted: false,
        },
        {
          id: "3-3",
          title: "Holistic Wellness Practices",
          description: "Integrating nutrition with overall wellness.",
          duration: "19:45",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDajb8T3oK67J9i8GNwM_t2pF-ZyHIaHhkfvjj0560UTbMzyzMThr8WiwVpWjKHn3cIBmKQNxGY-6dJAmXDPZYowe9uVOhLbKc18NRH7R2EMnodxRGLxXbvxB_2et92ihtR7A8VfxeepUZgOvDu-eiAzMOQsGGIvB_IdvtM9coxv4KxQ85hdlso__QVD6LzZF-FT2fi0HRvMfaL2JF97-04JQ9Kz6JH4kUio1q2Bjt3_7_xCr_GtNXaSj1-73f9R5fKnpVOFYuB3g",
          isCompleted: false,
        },
        {
          id: "3-4",
          title: "Community and Food",
          description: "The role of community in nourishment.",
          duration: "15:20",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXnkA8o1gcqnXEfvf_zuIYUrQZhKQb35ErTnTWjs5hUESZrFiExA9_A-ZCGpVj5oWLGgCiAnBIy4JkgPTbEIjmwOfk4nwkGzD8sk9M6JGBsiA5e8WwzUuwooCHnkqW0SrpWTI1KQDURXsU8ztU0me7JtmSHkKbCmk9VmXWMaVnh6knlKORDUE2k1OPkkCmg6lYWIj5iuB-xgtDEcFIpXRwyIYQ0iMjobl65WfaUn3LMzEh3VX2YvMU4Xuhcu_9NyK5S-6KaAbkXA",
          isCompleted: false,
        },
        {
          id: "3-5",
          title: "Sustainable Living",
          description: "Making sustainable food choices.",
          duration: "21:00",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCnLdgTvDcBkEL3LbgaoUlBzn8Xpmosl0jx-y8PKFTkhHc18uNxWESgc_ydleHzLDzxJUK7leL2yfXDopoVFNmOTYNcMIEBjEUQ-j-YZfuYMPijDZGEs3_WKvN1lTG1Ue3qBNlUMi3o-HT3Bg_Suu4-Etk3tBw-aPysCD5RPoK-C2fl154w1fPjS_vKcaLGXMBakSz1WxE1KkJzFK3rb-_FKhtHGChxrXUfyfRTEXiHMVcGop2iq_kev5McS2J1N2n3niGeFTR-0A",
          isCompleted: false,
        },
        {
          id: "3-6",
          title: "Your Personal Food Philosophy",
          description: "Developing your unique approach to nourishment.",
          duration: "25:00",
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKek1ycTvDvHn67cNo9XYRQ5wR0S-aIAp5a9pRaKu44KMBAiWILF_L3vJjOO8PQqBYVFW2_HGNnBnLXzyeWPam9QcODFl4-VGHHZ4j9amnm1wKmKR7BdEgrLWUFfNbW9cJPiIPZeAmps9EWmcVGryvZlTPU9WcS_nSAIOXaFHOrdqtOnfNglxSelqjOj55AVFuc2mti-3MafzxRhOuqLZWvysQet3tMqTwQE1gFz-GAdXq8-sJkX3rayv1jgh-0KJfVthmPxGEYQ",
          isCompleted: false,
        },
      ],
    },
  ];

  const currentPhase = phases.find((p) => p.id === selectedPhase) || phases[0];

  const handleVideoClick = (videoId: string) => {
    // TODO: Open video player modal
    console.log("Reproducir Video:", videoId);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel-bg">
        <div className="text-panel-text">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Get user's first name from email or displayName
  const firstName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-panel-bg">
      <div className="mx-auto flex max-w-[1024px] flex-col px-2 py-8 sm:px-10">
        <h1 className="pb-8 text-left text-3xl font-bold leading-tight tracking-tight text-panel-text sm:text-4xl">
          Bienvenid@, {firstName}
        </h1>

    

        {/* Next Activities */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-panel-text">Próximas Actividades</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NextActivityCard
              icon="groups"
              title="1-on-1 Session"
              time="Tomorrow, 3:00 PM"
            />
            <NextActivityCard
              icon="self_improvement"
              title="Meditation"
              time="Today, 8:00 PM"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-panel-text">Journal</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <QuickActionButton
              icon="edit_note"
              label="Journal"
              onClick={() => router.push("/journal")}
            />
            <QuickActionButton
              icon="scale"
              label="Log weight/height"
              onClick={() => {
                // TODO: Open weight logging modal
                console.log("Log weight");
              }}
            />
            <QuickActionButton
              icon="spa"
              label="Daily Meditation"
              onClick={() => {
                // TODO: Open meditation tracker
                console.log("Daily meditation");
              }}
            />
          </div>
        </div>


    {/* Phase Tabs */}
        <div className="mb-8">
          {/* <h2 className="mb-4 text-2xl font-bold text-panel-text">Fases del Programa</h2> */}
          <div className="grid grid-flow-row lg:grid-flow-col gap-2 rounded-3xl">
            {phases.map((phase) => (
              <PhaseTab
                key={phase.id}
                imageUrl={phase.imageUrl}
                title={phase.title}
                progress={phase.progress}
                isSelected={selectedPhase === phase.id}
                onClick={() => setSelectedPhase(phase.id)}
              />
            ))}
          </div>
        </div>


        {/* Videos Section - Changes based on selected phase */}
        <div>
          <h2 className="mb-4 text-2xl font-bold text-panel-text">
            {currentPhase.title} - Videos
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {currentPhase.videos.map((video) => (
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

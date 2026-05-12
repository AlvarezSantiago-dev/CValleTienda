'use client'

import { motion } from 'framer-motion'

interface Props {
  icon: React.ReactNode
  title: string
  description: string
  index: number
  iconBg?: string
  iconColor?: string
}

export function FeatureCard({
  icon,
  title,
  description,
  index,
  iconBg = 'bg-gray-50',
  iconColor = 'text-lime-700',
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="group bg-white border border-gray-100 rounded-2xl p-6 cursor-default
                 hover:border-gray-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)]
                 transition-shadow duration-200"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-4 ${iconBg} ${iconColor} transition-colors duration-200`}
      >
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5 tracking-tight">{title}</h3>
      <p className="text-[13px] text-gray-500 leading-relaxed">{description}</p>
    </motion.div>
  )
}

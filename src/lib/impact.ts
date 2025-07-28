import { calculateTokenCost } from './openai'
import { IMPACT_CONFIG, type ModelName } from './config'
import { z } from 'zod'

// Validation schemas
const tokenUsageSchema = z.object({
  inputTokens: z.number().min(0, 'Input tokens must be non-negative'),
  outputTokens: z.number().min(0, 'Output tokens must be non-negative'),
})

const treeCountSchema = z.number().min(0, 'Tree count must be non-negative')

export interface ImpactCalculation {
  inputCost: number
  outputCost: number
  totalCost: number
  donation: number
  trees: number
}

/**
 * Calculate environmental impact from token usage with proper cost calculation
 */
export function calculateImpact(
  inputTokens: number, 
  outputTokens: number,
  model: ModelName = 'gpt-4o-mini'
): ImpactCalculation {
  // Validate inputs
  const validatedTokens = tokenUsageSchema.parse({ inputTokens, outputTokens })
  
  // Calculate accurate costs using model-specific pricing
  const { inputCost, outputCost, totalCost } = calculateTokenCost(
    validatedTokens.inputTokens,
    validatedTokens.outputTokens,
    model
  )
  
  // Calculate donation and trees
  const donation = totalCost * IMPACT_CONFIG.DONATION_RATE
  const treesPlanted = donation * IMPACT_CONFIG.TREES_PER_POUND
  
  return {
    inputCost,
    outputCost,
    totalCost,
    donation: parseFloat(donation.toFixed(6)),
    trees: parseFloat(treesPlanted.toFixed(8)) // High precision for small numbers
  }
}

/**
 * Calculate progress towards next whole tree with validation
 */
export function getTreeProgress(totalTrees: number): {
  wholeTree: number
  progress: number
  nextTreeAt: number
} {
  const validTotalTrees = treeCountSchema.parse(totalTrees)
  const wholeTree = Math.floor(validTotalTrees)
  const fractional = validTotalTrees - wholeTree
  const nextTreeAt = wholeTree + 1
  
  return {
    wholeTree,
    progress: fractional,
    nextTreeAt
  }
}

// Milestone definition
export interface Milestone {
  trees: number
  message: string
  description: string
  icon: string
}

const MILESTONES: readonly Milestone[] = [
  { trees: 1, message: "Amazing! You planted your first tree!", description: "Your questions are making a real difference", icon: "🌳" },
  { trees: 5, message: "You're growing a grove!", description: "5 trees will absorb 125kg of CO₂ over their lifetime", icon: "🌿" },
  { trees: 25, message: "Forest guardian!", description: "25 trees provide oxygen for 2 people for a year", icon: "🌲" },
  { trees: 100, message: "Forest legend!", description: "100 trees create habitat for countless wildlife", icon: "🏞️" },
  { trees: 500, message: "Eco warrior!", description: "500 trees offset a year of car emissions", icon: "🌍" },
  { trees: 1000, message: "Nature's champion!", description: "1000 trees create a small forest ecosystem", icon: "🌴" }
] as const

/**
 * Get milestone achievement for tree count with validation
 */
export function checkMilestone(previousTrees: number, newTrees: number): Milestone | null {
  // Validate inputs
  const validPreviousTrees = treeCountSchema.parse(previousTrees)
  const validNewTrees = treeCountSchema.parse(newTrees)
  
  const previousWholeTree = Math.floor(validPreviousTrees)
  const newWholeTree = Math.floor(validNewTrees)
  
  // Check if we've crossed a milestone
  for (const milestone of MILESTONES) {
    if (previousWholeTree < milestone.trees && newWholeTree >= milestone.trees) {
      return milestone
    }
  }
  
  return null
}

/**
 * Get the next milestone for a given tree count
 */
export function getNextMilestone(treeCount: number): Milestone | null {
  const validTreeCount = treeCountSchema.parse(treeCount)
  const wholeTreeCount = Math.floor(validTreeCount)
  
  return MILESTONES.find(milestone => milestone.trees > wholeTreeCount) || null
}

/**
 * Get all achieved milestones for a tree count
 */
export function getAchievedMilestones(treeCount: number): Milestone[] {
  const validTreeCount = treeCountSchema.parse(treeCount)
  const wholeTreeCount = Math.floor(validTreeCount)
  
  return MILESTONES.filter(milestone => milestone.trees <= wholeTreeCount)
}
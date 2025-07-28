// Impact calculation constants
const COST_PER_1K_TOKENS = 0.02 // OpenAI GPT-4 pricing (£)
const DONATION_RATE = 0.4 // 40% to charity
const TREES_PER_POUND = 2.5 // Conservative: £1 = 2.5 trees (based on Ecosia model)

export interface ImpactCalculation {
  cost: number
  donation: number
  trees: number
}

/**
 * Calculate environmental impact from token usage
 */
export function calculateImpact(inputTokens: number, outputTokens: number): ImpactCalculation {
  const totalTokens = inputTokens + outputTokens
  const cost = (totalTokens / 1000) * COST_PER_1K_TOKENS
  const donation = cost * DONATION_RATE
  const treesPlanted = donation * TREES_PER_POUND
  
  return {
    cost: parseFloat(cost.toFixed(4)),
    donation: parseFloat(donation.toFixed(4)),
    trees: parseFloat(treesPlanted.toFixed(6)) // High precision for small numbers
  }
}

/**
 * Calculate progress towards next whole tree
 */
export function getTreeProgress(totalTrees: number): {
  wholeTree: number
  progress: number
  nextTreeAt: number
} {
  const wholeTree = Math.floor(totalTrees)
  const fractional = totalTrees - wholeTree
  const nextTreeAt = wholeTree + 1
  
  return {
    wholeTree,
    progress: fractional,
    nextTreeAt
  }
}

/**
 * Get milestone achievement for tree count
 */
export function checkMilestone(previousTrees: number, newTrees: number) {
  const milestones = [
    { trees: 1, message: "Amazing! You planted your first tree! 🌳", description: "Your questions are making a real difference" },
    { trees: 5, message: "You're growing a grove! 🌿", description: "5 trees will absorb 125kg of CO₂ over their lifetime" },
    { trees: 25, message: "Forest guardian! 🌲", description: "25 trees provide oxygen for 2 people for a year" },
    { trees: 100, message: "Forest legend! 🏞️", description: "100 trees create habitat for countless wildlife" }
  ]
  
  const previousWholeTree = Math.floor(previousTrees)
  const newWholeTree = Math.floor(newTrees)
  
  // Check if we've crossed a milestone
  for (const milestone of milestones) {
    if (previousWholeTree < milestone.trees && newWholeTree >= milestone.trees) {
      return milestone
    }
  }
  
  return null
}
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

// Use DIRECT_URL for seeding (bypasses pooler)
const adapter = new PrismaPg({ 
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL!
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create exams
  const fl215 = await prisma.exam.upsert({
    where: { code: "FL-2-15" },
    update: {},
    create: {
      code: "FL-2-15",
      name: "Florida 2-15 (Life, Health, Annuities)",
      state: "FL",
      description: "Covers life insurance, health insurance, and annuities for Florida agents",
      passingScore: 70,
      timeLimit: 120,
    },
  });

  const fl240 = await prisma.exam.upsert({
    where: { code: "FL-2-40" },
    update: {},
    create: {
      code: "FL-2-40",
      name: "Florida 2-40 (Health Only)",
      state: "FL",
      description: "Covers health insurance only for Florida agents",
      passingScore: 70,
      timeLimit: 90,
    },
  });

  const azLh = await prisma.exam.upsert({
    where: { code: "AZ-LH" },
    update: {},
    create: {
      code: "AZ-LH",
      name: "Arizona Life and Health Producer",
      state: "AZ",
      description: "Life and health insurance license for Arizona",
      passingScore: 70,
      timeLimit: 120,
    },
  });

  console.log("✅ Created exams");

  // Create topics for FL 2-15
  const lifeBasics = await prisma.topic.create({
    data: {
      examId: fl215.id,
      name: "Life Insurance Basics",
      weight: 1.5,
      sortOrder: 1,
    },
  });

  const policyProvisions = await prisma.topic.create({
    data: {
      examId: fl215.id,
      name: "Policy Provisions",
      weight: 1.2,
      sortOrder: 2,
    },
  });

  const annuities = await prisma.topic.create({
    data: {
      examId: fl215.id,
      name: "Annuities",
      weight: 1.3,
      sortOrder: 3,
    },
  });

  const healthIns = await prisma.topic.create({
    data: {
      examId: fl215.id,
      name: "Health Insurance",
      weight: 1.4,
      sortOrder: 4,
    },
  });

  console.log("✅ Created topics");

  // Create questions for FL 2-15
  const questions = [
    {
      examId: fl215.id,
      topicId: lifeBasics.id,
      questionText: "What is the primary purpose of life insurance?",
      explanation: "Life insurance provides financial protection for dependents in case of the insured's death, helping replace lost income and cover expenses.",
      difficulty: "EASY" as const,
      options: [
        { text: "To provide financial protection for dependents", correct: true },
        { text: "To generate investment returns", correct: false },
        { text: "To reduce tax liability", correct: false },
        { text: "To qualify for government benefits", correct: false },
      ],
    },
    {
      examId: fl215.id,
      topicId: lifeBasics.id,
      questionText: "Which type of life insurance provides coverage for a specific period?",
      explanation: "Term life insurance provides coverage for a specific period (term), such as 10, 20, or 30 years.",
      difficulty: "EASY" as const,
      options: [
        { text: "Whole life insurance", correct: false },
        { text: "Term life insurance", correct: true },
        { text: "Universal life insurance", correct: false },
        { text: "Variable life insurance", correct: false },
      ],
    },
    {
      examId: fl215.id,
      topicId: policyProvisions.id,
      questionText: "What is the 'free look' period in insurance?",
      explanation: "The free look period (typically 10-30 days) allows policyholders to review their new policy and return it for a full refund.",
      difficulty: "MEDIUM" as const,
      options: [
        { text: "Time to compare quotes from different insurers", correct: false },
        { text: "Period when no premiums are due", correct: false },
        { text: "Time to review and return a new policy for full refund", correct: true },
        { text: "Period of guaranteed insurability", correct: false },
      ],
    },
    {
      examId: fl215.id,
      topicId: annuities.id,
      questionText: "What does 'annuitant' mean?",
      explanation: "The annuitant is the person whose life expectancy is used to calculate annuity payments.",
      difficulty: "MEDIUM" as const,
      options: [
        { text: "The insurance company issuing the annuity", correct: false },
        { text: "The person who receives annuity payments", correct: true },
        { text: "The beneficiary of an annuity", correct: false },
        { text: "The agent who sold the annuity", correct: false },
      ],
    },
    {
      examId: fl215.id,
      topicId: policyProvisions.id,
      questionText: "What is a 'grace period' in insurance?",
      explanation: "The grace period is a specified time after the premium due date during which the policy remains in force.",
      difficulty: "EASY" as const,
      options: [
        { text: "Time before coverage begins", correct: false },
        { text: "Period after premium due date when policy stays active", correct: true },
        { text: "Waiting period for pre-existing conditions", correct: false },
        { text: "Time to file a claim after a loss", correct: false },
      ],
    },
    {
      examId: fl215.id,
      topicId: healthIns.id,
      questionText: "What is coinsurance in health insurance?",
      explanation: "Coinsurance is the percentage of covered expenses that the insured pays after the deductible has been met.",
      difficulty: "MEDIUM" as const,
      options: [
        { text: "Two insurance companies sharing the risk", correct: false },
        { text: "The percentage the insured pays after deductible", correct: true },
        { text: "The insurer pays 100% of all costs", correct: false },
        { text: "A flat fee per doctor visit", correct: false },
      ],
    },
  ];

  for (const q of questions) {
    const question = await prisma.question.create({
      data: {
        examId: q.examId,
        topicId: q.topicId,
        questionText: q.questionText,
        explanation: q.explanation,
        difficulty: q.difficulty,
      },
    });

    for (let i = 0; i < q.options.length; i++) {
      await prisma.answerOption.create({
        data: {
          questionId: question.id,
          optionText: q.options[i].text,
          isCorrect: q.options[i].correct,
          sortOrder: i,
        },
      });
    }
  }

  console.log("✅ Created questions");

  // Create flashcards
  const flashcards = [
    {
      examId: fl215.id,
      topicId: lifeBasics.id,
      frontText: "What is a beneficiary?",
      backText: "The person or entity designated to receive the death benefit or policy proceeds when the insured dies.",
    },
    {
      examId: fl215.id,
      topicId: lifeBasics.id,
      frontText: "What is an insurance premium?",
      backText: "The amount paid by the policyholder to the insurance company in exchange for coverage.",
    },
    {
      examId: fl215.id,
      topicId: policyProvisions.id,
      frontText: "What is underwriting?",
      backText: "The process by which an insurer evaluates the risk of insuring a potential policyholder.",
    },
    {
      examId: fl215.id,
      topicId: healthIns.id,
      frontText: "What is a deductible?",
      backText: "The amount the policyholder must pay out-of-pocket before the insurance company pays.",
    },
    {
      examId: fl215.id,
      topicId: policyProvisions.id,
      frontText: "What is a rider?",
      backText: "An addition or amendment to an insurance policy that modifies coverage.",
    },
  ];

  for (const fc of flashcards) {
    await prisma.flashcard.create({
      data: fc,
    });
  }

  console.log("✅ Created flashcards");

  // Create a manager user
  const managerPassword = await bcrypt.hash("manager123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      email: "manager@example.com",
      name: "Demo Manager",
      passwordHash: managerPassword,
      role: "MANAGER",
      status: "ACTIVE",
    },
  });

  // Create a demo student
  const studentPassword = await bcrypt.hash("student123", 12);
  const student = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      email: "student@example.com",
      name: "Demo Student",
      passwordHash: studentPassword,
      role: "STUDENT",
      status: "ACTIVE",
      createdBy: manager.id,
    },
  });

  // Assign exam to student
  await prisma.userExamAssignment.upsert({
    where: {
      userId_examId: {
        userId: student.id,
        examId: fl215.id,
      },
    },
    update: {},
    create: {
      userId: student.id,
      examId: fl215.id,
      assignedBy: manager.id,
    },
  });

  console.log("✅ Created demo users");
  console.log("");
  console.log("📧 Demo accounts:");
  console.log("   Manager: manager@example.com / manager123");
  console.log("   Student: student@example.com / student123");
  console.log("");
  console.log("🌱 Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

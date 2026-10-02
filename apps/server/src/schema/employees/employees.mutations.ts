import { arg, floatArg, idArg, list, mutationField, nonNull, stringArg } from "nexus"

export const createEmployee = mutationField("createEmployee", {
  type: nonNull("Employee"),
  args: {
    name: nonNull(stringArg()),
    title: stringArg(),
    walletAddress: nonNull(stringArg()),
    salaryAmount: nonNull(floatArg()),
    salaryCurrency: arg({ type: "SalaryCurrency" }),
  },
  resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    return ctx.prisma.employee.create({
      data: {
        name: args.name,
        title: args.title,
        walletAddress: args.walletAddress,
        salaryAmount: args.salaryAmount,
        salaryCurrency: args.salaryCurrency ?? "USD",
        userId: ctx.accountId,
      },
    })
  },
})

export const updateEmployee = mutationField("updateEmployee", {
  type: nonNull("Employee"),
  args: {
    id: nonNull(idArg()),
    name: stringArg(),
    title: stringArg(),
    walletAddress: stringArg(),
    salaryAmount: floatArg(),
    salaryCurrency: arg({ type: "SalaryCurrency" }),
  },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    const employee = await ctx.prisma.employee.findFirst({
      where: { id: args.id, userId: ctx.accountId },
    })
    if (!employee) throw new Error("Employee not found")

    return ctx.prisma.employee.update({
      where: { id: args.id },
      data: {
        ...(args.name != null ? { name: args.name } : {}),
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.walletAddress != null
          ? { walletAddress: args.walletAddress }
          : {}),
        ...(args.salaryAmount != null
          ? { salaryAmount: args.salaryAmount }
          : {}),
        ...(args.salaryCurrency != null
          ? { salaryCurrency: args.salaryCurrency }
          : {}),
      },
    })
  },
})

export const importEmployeesCsv = mutationField("importEmployeesCsv", {
  type: nonNull(list(nonNull("Employee"))),
  args: {
    csvContent: nonNull(stringArg()),
  },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")

    const lines = args.csvContent
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)

    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row")
    }

    const header = lines[0].toLowerCase().split(",").map((h: string) => h.trim())
    const nameIdx = header.indexOf("name")
    const walletIdx = header.indexOf("walletaddress")
    const salaryIdx = header.indexOf("usdsalary")
    const titleIdx = header.indexOf("title")

    if (nameIdx === -1 || walletIdx === -1 || salaryIdx === -1) {
      throw new Error(
        "CSV must have columns: name, walletAddress, usdSalary (title is optional)"
      )
    }

    const employees: { name: string; title: string | null; walletAddress: string; salaryAmount: number }[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c: string) => c.trim())
      const name = cols[nameIdx]
      const walletAddress = cols[walletIdx]
      const salaryRaw = cols[salaryIdx]
      const title = titleIdx !== -1 ? cols[titleIdx] || null : null

      if (!name || !walletAddress || !salaryRaw) {
        throw new Error(`Row ${i + 1}: name, walletAddress, and usdSalary are required`)
      }

      const salaryAmount = parseFloat(salaryRaw)
      if (isNaN(salaryAmount) || salaryAmount < 0) {
        throw new Error(`Row ${i + 1}: usdSalary must be a valid positive number`)
      }

      employees.push({ name, title, walletAddress, salaryAmount })
    }

    const created = await Promise.all(
      employees.map((emp) =>
        ctx.prisma.employee.create({
          data: {
            name: emp.name,
            title: emp.title,
            walletAddress: emp.walletAddress,
            salaryAmount: emp.salaryAmount,
            salaryCurrency: "USD",
            userId: ctx.accountId!,
          },
        })
      )
    )

    return created
  },
})

export const deleteEmployee = mutationField("deleteEmployee", {
  type: nonNull("Employee"),
  args: { id: nonNull(idArg()) },
  async resolve(_parent, args, ctx) {
    if (!ctx.accountId) throw new Error("Not authenticated")
    const employee = await ctx.prisma.employee.findFirst({
      where: { id: args.id, userId: ctx.accountId },
    })
    if (!employee) throw new Error("Employee not found")

    return ctx.prisma.employee.delete({ where: { id: args.id } })
  },
})

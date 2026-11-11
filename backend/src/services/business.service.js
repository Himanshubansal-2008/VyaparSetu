
const prisma = require("../lib/prisma");

const getBusinesses = async () => {
  return await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      city: true,
      state: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};

module.exports = {
  getBusinesses,
};

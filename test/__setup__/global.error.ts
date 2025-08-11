process.on('unhandledRejection', (reason: unknown) => {
  console.log(reason);
});

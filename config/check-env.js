export const checkRequiredEnv = () => {
    const required = [
      'NODE_ENV',
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'DB_PORT',
      'JWT_SECRET'
    ];
  
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('Missing required environment variables:', missing.join(', '));
      process.exit(1);
    }
  
    // Check database configuration
    const dbConfigured = !!(
      process.env.DB_HOST && 
      process.env.DB_USER && 
      process.env.DB_NAME &&
      process.env.DB_PASSWORD
    );
  
    if (!dbConfigured) {
      console.error('No valid database configuration found');
      process.exit(1);
    }
  
    console.log('Environment check passed');
    console.log(`Database host: ${process.env.DB_HOST}`);
    console.log('Environment:', process.env.NODE_ENV);
  };
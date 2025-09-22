# 🚂 Railway Environment Variables Setup

## ⚠️ Critical Fix for Firebase Error

Your Railway build is failing because it doesn't have the Firebase environment variables. Here are the **exact variables** you need to add in your Railway project dashboard:

## 🔑 Required Environment Variables

### Firebase Client Configuration
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB-vkL7PSqCOrKS7nTOtBEfUvX-CdhNZ6I
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dashdice-d1b86.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dashdice-d1b86
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dashdice-d1b86.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=816081934821
NEXT_PUBLIC_FIREBASE_APP_ID=1:816081934821:web:a81f03c18b89fc3038770c
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-LM67QC0E5T
```

### Firebase Admin SDK (for server-side operations)
```bash
FIREBASE_PROJECT_ID=dashdice-d1b86
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@dashdice-d1b86.iam.gserviceaccount.com
```

### Firebase Private Key (Special formatting required)
```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/jTIZt3VDuiLA\nMLh6iexsRoSKfSl1CCqDjmfrTg98LauANayY/ai7Ot/ggsBtYlJxqwjp1bgpGDMD\nxtiWZwGLZdgO6FKwae623h4hqGmEq+/mpV6ypjItlCqck3l5HgmSid//9I3FcvRD\nrr2F5jnewjlkpxyVIunVOf8lbnVLompql82Qudt8Hcbho/snfzrRzvBaLJPxDEjY\nzTC70Cvjy23QoEUjw6Mt6saFgCTKOchuc0yP8PpG0UCNz+25pzCBc4BewIblnAFd\nda1RKQOzcBwy6WkhDhtezMqQN5A3M+Z2DIZKPAT+Q0bE9vfAI2Qy+wcKxXjDWHJf\nyfcHVSPBAgMBAAECggEAI6KAz4fxqMfX7ykhKKq/8OStg5YFQGBkiFTVwFClUNSu\nMwvJMC0AVtR9EadBZRgFfl/zKI051WtLEkjLwi8nemdX6m4N9APBBQQNVvWdq7DQ\n0HezRkjkzNXjl31X+9A6t6guo887EKByEKVRXLeXzHkVdEQibRwxpBlF/hCugYND\nEGESR3G2n01D61JZ9VghBXEbZhYY+k6MyB803g0i59hJU3D+wNW2l4LUkDJRCTwd\n690JAfzdA8vdUk6xdni09Cu7fbWxpugMCwBTSjM5SvcpTM5ghdYPAX0HS8Aj4B7e\nY295lZO4Lx1suH6zgzxVcr2/KKX3iOxvXnHy3HiOAQKBgQDnSW+WTAcCB6cgV+2G\n5kDpg6B4NTnaSg95k6ddlOUm0rJPznbFn5sNnuyUNaA7gDxM9XHQY5tsfXvWVGKn\nDez/8ci8B5ZlQodEPogDtCNUHfAdK2C7bWxOb93MQZUerfyjOxT5KbcdQ69+16Uq\n+3v5TF26Xys49PEEoI+hU7qOZQKBgQDUBNmLwD9SCuQa72BWh2oxxr7p4g+jInZH\nESiTYKkm5NpEu7rr/gR7E3+fb09sZ/NA2TIYwAhN8MpOCs/38ryjMD2Wc7I1MajV\nlO0GyedgVf6QFHmd0rzpVM/mmxOrULehQA0de57SKwFkBfDKtjYEc/xV8V/J6IZ/\nqQbn4GHsLQKBgAxYRRZ2lGEtW2REjS8IFyrfla8U2DOohE7u7J34FosN7+qGkJxX\nuoTtmJ8IhbbnT1CkQSDoUCFoSTXVZzaXbbDzjM1McmCRPnsMA2J/OOuCdZB5Aj6+\nxmshWWtPjNAIZVWpD6OE8HslY7aXd/9lUOarhs0tyzbNDBg9Ia1wtKJpAoGBAJUX\ny/uQd3a0HfArAS4YD79tKXfC9ogbhd033ba1tH2bVTocYbfuayw5a/esCMgM2Wxy\nz93DvJNCjqEOzWxpD+oZ1FVmip0JjNaU4ZFyjfiawGaFX3hyZ1IVyBU8XDqOinMk\nXZSsB+V3RIUYAFoshBPhlELDeD69+0buj+KjUXkJAoGAJov/4Q5bo48iD8eE0zIj\nenMy6PJbcXk+zEb+9wfWsnB0rEvli0+/IDm03ccsQfatan5BzfnhZYw5w1XzZl/F\nVSfixxwdQB8nyfnwgxfob7oEivaeb7tzXZyE7VRK1HkK2RHLFDIto4+3+FZkyprt\nVaSunagBr19MhxVlcAv4rhY=\n-----END PRIVATE KEY-----"
```

### Environment Settings
```bash
NODE_ENV=production
```

## 📋 How to Add These in Railway

1. **Go to your Railway project dashboard**
2. **Click on your service**
3. **Go to "Variables" tab**
4. **Add each variable one by one**

### ⚠️ Important Notes:

- **Copy-paste exactly** - don't modify the values
- **Include quotes** for FIREBASE_PRIVATE_KEY
- **Keep the \n characters** in the private key
- **Make sure no extra spaces** are added

## 🔄 After Adding Variables

Once you've added all variables:
1. **Redeploy** your Railway service
2. **Check logs** for any remaining errors
3. **Test** your application

## 🎯 Quick Copy Commands

You can copy these one-by-one into Railway's environment variables interface.

---

**Status**: ⚠️ Railway build will fail until these variables are added!

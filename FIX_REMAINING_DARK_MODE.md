# Remaining Dark Mode Fixes - Quick Reference

## ✅ COMPLETED (4 screens)
1. Dashboard ✓
2. Contracts ✓  
3. Calendar ✓
4. Cars/Fleet ✓
5. Profile ✓

## 🔄 IN PROGRESS
- Contract Details
- Car Details  
- New Contract Form

## PATTERN TO APPLY

### For SimpleGlassCard components:
Already handled by the component itself - uses `colors.card` automatically

### For raw View cards:
```typescript
<View style={[styles.card, { backgroundColor: colors.card }]}>
```

### For text:
```typescript
<Text style={[styles.text, { color: colors.text }]}>          // Primary text
<Text style={[styles.text, { color: colors.textSecondary }]}> // Secondary text
```

### For TextInput:
```typescript
<TextInput 
  style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
  placeholderTextColor={colors.textSecondary}
/>
```

### For icons:
```typescript
<Ionicons name="icon" color={colors.textSecondary} />
```

## Screens Using SimpleGlassCard (Auto-Fixed)
These already use theme colors:
- Most detail screens use SimpleGlassCard
- GlassCard component already theme-aware

## Priority Order
1. Contract/Car details (high visibility)
2. New contract form
3. Remaining utility screens


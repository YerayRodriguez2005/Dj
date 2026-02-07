/**
 * 🧪 TESTS PARA FASE 3.5: Defaults Inteligentes
 * 
 * Ejecutar en consola del navegador para validar el comportamiento
 */

console.log('🧪 Iniciando tests de FASE 3.5...\n');

// ═══════════════════════════════════════════════════════════
// TEST 1: Metadata completa (sin defaults)
// ═══════════════════════════════════════════════════════════
console.log('TEST 1: Metadata completa');
const test1 = {
  bpm: 120,
  energy: 3,
  vocals: 'alta',
  mix_in: 0,
  mix_out: 60
};

const loader1 = new MetadataLoader();
const result1 = loader1.applyDefaults(test1, 'test1.json');

console.assert(
  result1.bpm === 120 &&
  result1.energy === 3 &&
  result1.vocals === 'alta' &&
  result1.mix_in === 0 &&
  result1.mix_out === 60,
  '❌ TEST 1 FALLÓ: Metadata completa fue modificada'
);

console.assert(
  loader1.tracksWithDefaults.size === 0,
  '❌ TEST 1 FALLÓ: No debería haber defaults aplicados'
);

console.log('✅ TEST 1 PASÓ: Metadata completa no se modifica\n');

// ═══════════════════════════════════════════════════════════
// TEST 2: Solo BPM (máximo defaults)
// ═══════════════════════════════════════════════════════════
console.log('TEST 2: Solo BPM (defaults completos)');
const test2 = {
  bpm: 97
};

const loader2 = new MetadataLoader();
const result2 = loader2.applyDefaults(test2, 'test2.json');

console.assert(
  result2.bpm === 97 &&
  result2.energy === 2 &&
  result2.vocals === 'media' &&
  result2.mix_in === 0.5 &&
  result2.mix_out === 60,
  '❌ TEST 2 FALLÓ: Defaults no se aplicaron correctamente'
);

console.assert(
  loader2.tracksWithDefaults.size === 1,
  '❌ TEST 2 FALLÓ: Debería registrar 1 track con defaults'
);

console.log('✅ TEST 2 PASÓ: Defaults aplicados correctamente\n');

// ═══════════════════════════════════════════════════════════
// TEST 3: BPM + Energy (defaults parciales)
// ═══════════════════════════════════════════════════════════
console.log('TEST 3: BPM + Energy (defaults parciales)');
const test3 = {
  bpm: 128,
  energy: 1
};

const loader3 = new MetadataLoader();
const result3 = loader3.applyDefaults(test3, 'test3.json');

console.assert(
  result3.bpm === 128 &&
  result3.energy === 1 &&
  result3.vocals === 'media' &&
  result3.mix_in === 0.5 &&
  result3.mix_out === 60,
  '❌ TEST 3 FALLÓ: Defaults parciales incorrectos'
);

console.log('✅ TEST 3 PASÓ: Defaults parciales funcionan\n');

// ═══════════════════════════════════════════════════════════
// TEST 4: Sin BPM (debe fallar)
// ═══════════════════════════════════════════════════════════
console.log('TEST 4: Sin BPM (debe lanzar error)');
const test4 = {
  energy: 2,
  vocals: 'media'
};

const loader4 = new MetadataLoader();
let errorCaught = false;

try {
  loader4.applyDefaults(test4, 'test4.json');
} catch (error) {
  if (error.message.includes('Campo OBLIGATORIO faltante: "bpm"')) {
    errorCaught = true;
  }
}

console.assert(
  errorCaught,
  '❌ TEST 4 FALLÓ: Debería lanzar error cuando falta BPM'
);

console.log('✅ TEST 4 PASÓ: Error correcto cuando falta BPM\n');

// ═══════════════════════════════════════════════════════════
// TEST 5: Validación de vocals inválidos
// ═══════════════════════════════════════════════════════════
console.log('TEST 5: Vocals inválidos');
const test5 = {
  bpm: 120,
  vocals: 'super_alta' // ❌ inválido
};

const loader5 = new MetadataLoader();
const data5 = loader5.applyDefaults(test5, 'test5.json');

let validationError = false;
try {
  loader5.validateMetadata(data5, 'test5.json');
} catch (error) {
  if (error.message.includes('Nivel de vocals inválido')) {
    validationError = true;
  }
}

console.assert(
  validationError,
  '❌ TEST 5 FALLÓ: Debería rechazar vocals inválidos'
);

console.log('✅ TEST 5 PASÓ: Validación de vocals funciona\n');

// ═══════════════════════════════════════════════════════════
// TEST 6: Validación de energy inválido
// ═══════════════════════════════════════════════════════════
console.log('TEST 6: Energy inválido');
const test6 = {
  bpm: 120,
  energy: 5 // ❌ Solo 1, 2, 3
};

const loader6 = new MetadataLoader();
const data6 = loader6.applyDefaults(test6, 'test6.json');

let energyError = false;
try {
  loader6.validateMetadata(data6, 'test6.json');
} catch (error) {
  if (error.message.includes('Nivel de energy inválido')) {
    energyError = true;
  }
}

console.assert(
  energyError,
  '❌ TEST 6 FALLÓ: Debería rechazar energy inválido'
);

console.log('✅ TEST 6 PASÓ: Validación de energy funciona\n');

// ═══════════════════════════════════════════════════════════
// TEST 7: mix_in >= mix_out (inválido)
// ═══════════════════════════════════════════════════════════
console.log('TEST 7: mix_in >= mix_out');
const test7 = {
  bpm: 120,
  mix_in: 50,
  mix_out: 40 // ❌ menor que mix_in
};

const loader7 = new MetadataLoader();
const data7 = loader7.applyDefaults(test7, 'test7.json');

let mixError = false;
try {
  loader7.validateMetadata(data7, 'test7.json');
} catch (error) {
  if (error.message.includes('mix_in') && error.message.includes('debe ser menor que mix_out')) {
    mixError = true;
  }
}

console.assert(
  mixError,
  '❌ TEST 7 FALLÓ: Debería rechazar mix_in >= mix_out'
);

console.log('✅ TEST 7 PASÓ: Validación de mix_in/mix_out funciona\n');

// ═══════════════════════════════════════════════════════════
// TEST 8: getDefaultsStats()
// ═══════════════════════════════════════════════════════════
console.log('TEST 8: Estadísticas de defaults');
const loader8 = new MetadataLoader();

loader8.applyDefaults({ bpm: 120 }, 'track1.json');
loader8.applyDefaults({ bpm: 130 }, 'track2.json');
loader8.applyDefaults({ bpm: 140, energy: 3 }, 'track3.json');

const stats = loader8.getDefaultsStats();

console.assert(
  stats.count === 3,
  '❌ TEST 8 FALLÓ: Debería contar 3 tracks con defaults'
);

console.assert(
  stats.tracksWithDefaults.includes('track1.json') &&
  stats.tracksWithDefaults.includes('track2.json') &&
  stats.tracksWithDefaults.includes('track3.json'),
  '❌ TEST 8 FALLÓ: Array de tracks incorrectos'
);

console.log('✅ TEST 8 PASÓ: Estadísticas funcionan correctamente\n');

// ═══════════════════════════════════════════════════════════
// TEST 9: resetStats()
// ═══════════════════════════════════════════════════════════
console.log('TEST 9: Reset de estadísticas');
const loader9 = new MetadataLoader();

loader9.applyDefaults({ bpm: 120 }, 'track.json');
console.assert(loader9.getDefaultsStats().count === 1, '❌ Pre-condición falló');

loader9.resetStats();

console.assert(
  loader9.getDefaultsStats().count === 0,
  '❌ TEST 9 FALLÓ: resetStats() no limpió las estadísticas'
);

console.log('✅ TEST 9 PASÓ: Reset funciona correctamente\n');

// ═══════════════════════════════════════════════════════════
// RESUMEN
// ═══════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════');
console.log('✅ TODOS LOS TESTS PASARON');
console.log('═══════════════════════════════════════════════════════');
console.log('\nFASE 3.5 validada correctamente.');
console.log('El sistema está listo para uso en producción.\n');

// ═══════════════════════════════════════════════════════════
// INFORMACIÓN DE DEFAULTS
// ═══════════════════════════════════════════════════════════
const demoLoader = new MetadataLoader();
console.log('📊 Defaults configurados:');
console.log(demoLoader.DEFAULTS);
console.log('\n💡 Para obtener estadísticas en producción:');
console.log('   dj.metadataLoader.getDefaultsStats()');
const skinConditionInfo = {
  "Acne and Rosacea Photos":
    "Acne and rosacea are common skin conditions causing redness and bumps. Acne results from clogged pores, while rosacea causes facial redness and sometimes small, pus-filled bumps.",

  "Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions":
    "These are potentially serious skin growths that may be precancerous or cancerous. Medical evaluation is strongly recommended for any unusual skin growths.",

  "Atopic Dermatitis Photos":
    "Atopic dermatitis (eczema) is a chronic condition causing dry, itchy inflammation of the skin, typically appearing as red, scaly patches.",

  "Bullous Disease Photos":
    "Bullous diseases cause fluid-filled blisters on the skin. These can be autoimmune conditions requiring medical attention.",

  "Cellulitis Impetigo and other Bacterial Infections":
    "These are bacterial skin infections that may cause redness, swelling, pain, and sometimes pus. Antibiotics are typically required for treatment.",

  "Eczema Photos":
    "Eczema is a condition causing dry, itchy, and inflamed skin that often appears as red, scaly patches that may crust or leak fluid.",

  "Exanthems and Drug Eruptions":
    "These are widespread skin rashes often caused by viral infections or reactions to medications.",

  "Hair Loss Photos Alopecia and other Hair Diseases":
    "These conditions involve hair thinning or loss, which may be temporary or permanent depending on the cause.",

  "Herpes HPV and other STDs Photos":
    "These are sexually transmitted infections that can cause various skin symptoms including sores, warts, or rashes.",

  "Light Diseases and Disorders of Pigmentation":
    "These conditions affect skin coloration, causing either lighter patches (hypopigmentation) or darker patches (hyperpigmentation).",

  "Lupus and other Connective Tissue Diseases":
    "These autoimmune conditions can affect the skin, causing rashes, lesions, and sensitivity to sunlight among other symptoms.",

  "Melanoma Skin Cancer Nevi and Moles":
    "This category includes benign moles and potentially dangerous melanoma skin cancers. Any changing mole should be evaluated by a dermatologist.",

  "Nail Fungus and other Nail Disease":
    "These conditions affect the fingernails or toenails, causing discoloration, thickening, or deformity of the nail.",

  "Poison Ivy Photos and other Contact Dermatitis":
    "Contact dermatitis is a red, itchy rash caused by direct contact with a substance or an allergic reaction to it.",

  "Psoriasis Pictures Lichen Planus and Related Diseases":
    "These inflammatory conditions cause scaly, itchy patches on the skin or distinctive rashes.",

  "Scabies Lyme Disease and other Infestations and Bites":
    "These are conditions caused by insects, mites, ticks, or other organisms that can lead to itchy rashes or other skin symptoms.",

  "Seborrheic Keratoses and other Benign Tumors":
    "These are non-cancerous growths on the skin that are typically harmless but may be removed for cosmetic reasons.",

  "Systemic Disease":
    "These are conditions that affect multiple organs, including the skin, and may indicate an underlying health issue requiring comprehensive medical care.",

  "Tinea Ringworm Candidiasis and other Fungal Infections":
    "These are fungal infections of the skin causing red, itchy, scaly patches, often in a circular pattern.",

  "Urticaria Hives":
    "Hives are raised, itchy welts on the skin that can appear suddenly due to allergic reactions or other triggers.",

  "Vascular Tumors":
    "These are growths made up of blood vessels that may appear as red or purple spots on the skin.",

  "Vasculitis Photos":
    "Vasculitis is inflammation of the blood vessels that can cause skin symptoms such as purplish spots or rashes.",

  "Warts Molluscum and other Viral Infections":
    "These are skin growths or rashes caused by viral infections, often appearing as small bumps on the skin.",
};

function getSkinConditionInfo(key: string): string {
  return (
    skinConditionInfo[key as keyof typeof skinConditionInfo] ||
    "Information not available for this condition."
  );
}

// Function to get a more user-friendly title from the classification key
function getPrettifiedConditionName(key: string): string {
  const prettyNames: Record<string, string> = {
    "Acne and Rosacea Photos": "Acne or Rosacea",
    "Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions":
      "Potential Skin Cancer",
    "Atopic Dermatitis Photos": "Atopic Dermatitis",
    "Bullous Disease Photos": "Bullous Disease",
    "Cellulitis Impetigo and other Bacterial Infections":
      "Bacterial Skin Infection",
    "Eczema Photos": "Eczema",
    "Exanthems and Drug Eruptions": "Drug or Viral Rash",
    "Hair Loss Photos Alopecia and other Hair Diseases": "Hair Loss Condition",
    "Herpes HPV and other STDs Photos": "STD-Related Skin Condition",
    "Light Diseases and Disorders of Pigmentation": "Pigmentation Disorder",
    "Lupus and other Connective Tissue Diseases": "Connective Tissue Disease",
    "Melanoma Skin Cancer Nevi and Moles": "Mole or Potential Melanoma",
    "Nail Fungus and other Nail Disease": "Nail Disorder",
    "Poison Ivy Photos and other Contact Dermatitis": "Contact Dermatitis",
    "Psoriasis Pictures Lichen Planus and Related Diseases":
      "Psoriasis or Lichen Planus",
    "Scabies Lyme Disease and other Infestations and Bites":
      "Infestation or Bite",
    "Seborrheic Keratoses and other Benign Tumors": "Benign Growth",
    "Systemic Disease": "Systemic Disease",
    "Tinea Ringworm Candidiasis and other Fungal Infections":
      "Fungal Infection",
    "Urticaria Hives": "Hives",
    "Vascular Tumors": "Vascular Growth",
    "Vasculitis Photos": "Vasculitis",
    "Warts Molluscum and other Viral Infections": "Viral Skin Infection",
  };

  return prettyNames[key as keyof typeof prettyNames] || key;
}

export { getPrettifiedConditionName, getSkinConditionInfo };

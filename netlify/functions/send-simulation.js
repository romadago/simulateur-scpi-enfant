// Fichier : netlify/functions/send-simulation.js
// Version mise à jour pour le COACH ÉPARGNE

const { Resend } = require('resend');

exports.handler = async function(event) {
  // Accepter uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body);
    const { email, values, results, simulatorTitle } = data;

    // --- Formatage des résultats pour l'email ---
    const repartitionHtml = `
        <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #0056b3;">Répartition de votre épargne mensuelle conseillée</h4>
            <p>Capacité d'épargne estimée : <strong>${Math.round(results.capaciteEpargne).toLocaleString('fr-FR')} € / mois</strong></p>
            <p>Part sécurisée (${results.pourcentages.securise}%) : <strong>${Math.round(results.repartition.securise).toLocaleString('fr-FR')} € / mois</strong></p>
            <p>Part dynamique (${results.pourcentages.dynamique}%) : <strong>${Math.round(results.repartition.dynamique).toLocaleString('fr-FR')} € / mois</strong></p>
        </div>
    `;

    const projectionHtml = `
        <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
             <h4 style="margin-top: 0; color: #0056b3;">Projection du capital</h4>
             <p>En suivant cette stratégie, votre capital dans ${values.dureeProjection} ans est estimé à :</p>
             <p style="font-size: 20px; font-weight: bold;">${Math.round(results.capitalProjete).toLocaleString('fr-FR')} €</p>
        </div>
    `;

    // --- Envoi de l'email ---
    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: `Votre stratégie d'épargne personnalisée`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Bonjour,</h2>
          <p>Merci d'avoir utilisé notre simulateur "${simulatorTitle}". Voici votre stratégie personnalisée.</p>
          
          <h3 style="color: #333;">Vos paramètres :</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>Salaire mensuel net :</strong> ${values.salaire.toLocaleString('fr-FR')} €</li>
            <li><strong>Charges de logement :</strong> ${values.chargesLogement.toLocaleString('fr-FR')} €</li>
            <li><strong>Âge :</strong> ${values.age} ans</li>
            <li><strong>Épargne existante :</strong> ${values.epargneExistante.toLocaleString('fr-FR')} €</li>
          </ul>

          <h3 style="color: #333;">Votre stratégie conseillée :</h3>
          ${repartitionHtml}
          ${projectionHtml}
          
          <p>Pour mettre en place une stratégie adaptée, n'hésitez pas à nous contacter.</p>
          <br>
          <p>Cordialement,</p>
          <p><strong>L'équipe Aeternia Patrimoine</strong></p>
        </div>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email envoyé avec succès !' }),
    };

  } catch (error) {
    console.error("Erreur dans la fonction Netlify :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Une erreur est survenue lors de l'envoi de l'email." }),
    };
  }
};
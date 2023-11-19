import * as tf from '@tensorflow/tfjs';
import fs from 'fs';


export async function generateRecommendations(userId) {
    // Load the data
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    const { exhibitsData, usersData } = data;
  
    // Find the user
    const user = usersData.find(user => user.user_id === userId);
    if (!user) {
      throw new Error('User not found');
    }
  
    // Create a profile for the user
    const profile = {};
    if (user && user.interests) {
        user.interests.forEach(interest => {
          profile[interest] = (profile[interest] || 0) + 1;
        });
      } else {
        throw new Error('User not found or user has no interests');
      }
  
    // Create a vector of user-item interactions
    const userItemVector = exhibitsData.map(exhibit => {
      let score = 0;
      exhibit.tags.forEach(tag => {
        if (profile[tag]) {
          score += profile[tag];
        }
      });
      return score;
    });
  
    // Convert the vector to a tensor
    const userItemTensor = tf.tensor(userItemVector);

    // Calculate the similarity scores
    const norms = userItemTensor.norm(2).expandDims(0);
    const normalized = userItemTensor.div(norms);
  
    // Convert the tensor back to an array
    const normalizedArray = normalized.arraySync();
  
    // Exhibit reccomendations
    const recommendations = normalizedArray.map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => {
    const exhibit = exhibitsData[item.index];
    return {
        id: exhibit.exhibit_id,
        image: exhibit.image,
        score: item.score
    };
    });

return recommendations;

}

